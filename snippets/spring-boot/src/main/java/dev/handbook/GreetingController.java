package dev.handbook;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {
    public record GreetingRequest(@NotBlank @Size(max = 80) String name) {}
    public record GreetingResponse(String message, String subject) {}

    @PostMapping("/api/greetings")
    public GreetingResponse greet(
            @Valid @RequestBody GreetingRequest request,
            @AuthenticationPrincipal Jwt principal) {
        return new GreetingResponse("Hello, " + request.name().strip() + ".", principal.getSubject());
    }
}
