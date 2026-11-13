package dev.handbook;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.util.JSONObjectUtils;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApplicationTest {
    private static final RSAKey KEY = signingKey();
    private static final HttpServer IDENTITY = identityServer();
    private static final String ISSUER = "http://127.0.0.1:" + IDENTITY.getAddress().getPort();
    private static final String AUDIENCE = "portal-api";
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void identityProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
        registry.add("spring.security.oauth2.resourceserver.jwt.audiences", () -> AUDIENCE);
    }

    private static RSAKey signingKey() {
        try {
            return new RSAKeyGenerator(2048).keyID("test-key").generate();
        } catch (JOSEException exception) {
            throw new IllegalStateException("Could not generate a test signing key.", exception);
        }
    }

    private static HttpServer identityServer() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            String issuer = "http://127.0.0.1:" + server.getAddress().getPort();
            Map<String, String> endpoints = Map.of(
                    "/.well-known/openid-configuration",
                    "{\"issuer\":\"" + issuer + "\",\"jwks_uri\":\"" + issuer + "/jwks\"}",
                    "/jwks", new JWKSet(KEY.toPublicJWK()).toString());
            endpoints.forEach((path, body) -> server.createContext(path, exchange -> {
                try (exchange) {
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, bytes.length);
                    exchange.getResponseBody().write(bytes);
                }
            }));
            server.start();
            return server;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not start the test identity fixture.", exception);
        }
    }

    @AfterAll
    static void stopIdentity() {
        IDENTITY.stop(0);
    }

    private static String token(String issuer, String audience, Instant expiry,
            Instant notBefore, String scope, RSAKey key) throws JOSEException {
        var claims = new JWTClaimsSet.Builder()
                .issuer(issuer).audience(audience).subject("user-123")
                .issueTime(Date.from(Instant.now()))
                .expirationTime(Date.from(expiry)).notBeforeTime(Date.from(notBefore))
                .claim("scope", scope).build();
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    private static String validToken(String scope) throws JOSEException {
        return token(ISSUER, AUDIENCE, Instant.now().plusSeconds(300),
                Instant.now().minusSeconds(10), scope, KEY);
    }

    private HttpResponse<String> request(String path, String body, String bearer) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10));
        if (bearer != null) builder.header("Authorization", "Bearer " + bearer);
        if (body != null) {
            builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        }
        return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void servesHealthWithoutExposingOtherManagementEndpoints() throws Exception {
        var health = request("/actuator/health", null, null);
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(JSONObjectUtils.parse(health.body())).isEqualTo(Map.of("status", "UP"));
        var environment = request("/actuator/env", null, validToken("greetings:write"));
        assertThat(environment.statusCode()).isEqualTo(403);
        assertThat(environment.body()).doesNotContain("OIDC_ISSUER");
    }

    @Test
    void returnsTheValidatedNameAndVerifiedSubject() throws Exception {
        var response = request("/api/greetings", "{\"name\":\"  Ada  \"}", validToken("greetings:write"));
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("content-type")).hasValue("application/json");
        assertThat(JSONObjectUtils.parse(response.body()))
                .isEqualTo(Map.of("message", "Hello, Ada.", "subject", "user-123"));
        assertThat(response.headers().allValues("set-cookie")).isEmpty();
    }

    @Test
    void requiresAuthenticationAndTheWriteScope() throws Exception {
        var anonymous = request("/api/greetings", "{\"name\":\"Ada\"}", null);
        assertThat(anonymous.statusCode()).isEqualTo(401);
        var forbidden = request("/api/greetings", "{\"name\":\"Ada\"}", validToken("greetings:read"));
        assertThat(forbidden.statusCode()).isEqualTo(403);
        assertThat(forbidden.body()).doesNotContain("Hello");
    }

    static Stream<Arguments> invalidTokens() throws JOSEException {
        Instant now = Instant.now();
        return Stream.of(
                Arguments.of("wrong issuer", token("https://untrusted.example.test", AUDIENCE,
                        now.plusSeconds(300), now.minusSeconds(10), "greetings:write", KEY)),
                Arguments.of("wrong audience", token(ISSUER, "another-api",
                        now.plusSeconds(300), now.minusSeconds(10), "greetings:write", KEY)),
                Arguments.of("expired", token(ISSUER, AUDIENCE,
                        now.minusSeconds(3600), now.minusSeconds(7200), "greetings:write", KEY)),
                Arguments.of("not yet valid", token(ISSUER, AUDIENCE,
                        now.plusSeconds(7200), now.plusSeconds(3600), "greetings:write", KEY)),
                Arguments.of("untrusted signature", token(ISSUER, AUDIENCE,
                        now.plusSeconds(300), now.minusSeconds(10), "greetings:write", signingKey())));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidTokens")
    void rejectsInvalidTokens(String reason, String bearer) throws Exception {
        var response = request("/api/greetings", "{\"name\":\"Ada\"}", bearer);
        assertThat(response.statusCode()).as(reason).isEqualTo(401);
        assertThat(response.body()).doesNotContain("Hello");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void rejectsBlankNames(String name) throws Exception {
        var response = request("/api/greetings", "{\"name\":\"" + name + "\"}", validToken("greetings:write"));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.headers().firstValue("content-type")).hasValue("application/problem+json");
        assertThat(JSONObjectUtils.parse(response.body())).containsEntry("status", 400L);
    }

    @Test
    void enforcesTheNameLengthBoundaryWithoutEchoingRejectedInput() throws Exception {
        var accepted = request("/api/greetings", "{\"name\":\"" + "a".repeat(80) + "\"}", validToken("greetings:write"));
        assertThat(accepted.statusCode()).isEqualTo(200);
        String rejected = "s".repeat(81);
        var response = request("/api/greetings", "{\"name\":\"" + rejected + "\"}", validToken("greetings:write"));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).doesNotContain(rejected);
    }

    @Test
    void rejectsMalformedJsonWithASafeProblemResponse() throws Exception {
        var response = request("/api/greetings", "{invalid", validToken("greetings:write"));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(JSONObjectUtils.parse(response.body()))
                .containsEntry("detail", "A valid JSON request body is required.");
        assertThat(response.body()).doesNotContain("{invalid");
    }
}
