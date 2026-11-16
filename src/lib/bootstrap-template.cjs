const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const stack = __STACK_CONFIG__;
const name = process.argv[2] || 'my-stack';
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
  console.error('Project name must contain only letters, numbers, underscores, and hyphens.');
  process.exit(1);
}

const root = resolve(process.cwd(), name);
try {
  mkdirSync(root);
} catch (error) {
  console.error(`Cannot create ${root}: ${error.message}`);
  process.exit(1);
}

function write(path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, { flag: 'wx' });
}

function runNpx(args) {
  const windows = process.platform === 'win32';
  const executable = windows ? process.env.ComSpec || 'cmd.exe' : 'npx';
  const commandArgs = windows ? ['/d', '/s', '/c', ['npx.cmd', ...args].join(' ')] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NEXT_TELEMETRY_DISABLED: '1', NG_CLI_ANALYTICS: 'false' },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Frontend scaffolding failed: ${result.error?.message || `exit ${result.status}`}`);
  }
}

const frontendCommands = {
  'frontend/astro': ['--yes', 'create-astro@5.3.2', 'frontend', '--template', 'minimal', '--no-install', '--no-git', '--yes'],
  'frontend/nextjs': ['--yes', 'create-next-app@16.4.6', 'frontend', '--ts', '--app', '--no-tailwind', '--use-npm', '--skip-install', '--disable-git', '--no-agent-feedback', '--yes'],
  'frontend/angular': ['--yes', '@angular/cli@22.2.7', 'new', 'frontend', '--defaults', '--skip-git', '--skip-install', '--interactive=false', '--package-manager=npm'],
};

const backendFiles = {
  'backend-apis/fastapi': {
    'backend/requirements.txt': 'fastapi[standard]==0.162.6\n',
    'backend/main.py': 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/health")\ndef health():\n    return {"status": "ok"}\n',
  },
  'backend-apis/fastify': {
    'backend/package.json': `${JSON.stringify({
      name: 'backend',
      private: true,
      type: 'module',
      scripts: { start: 'node server.mjs' },
      dependencies: { fastify: '5.12.7' },
    }, null, 2)}\n`,
    'backend/server.mjs': "import Fastify from 'fastify';\n\nconst app = Fastify({ logger: true });\napp.get('/health', async () => ({ status: 'ok' }));\nawait app.listen({ port: 3001, host: '127.0.0.1' });\n",
  },
  'backend-apis/spring-boot': {
    'backend/pom.xml': `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>4.1.2</version><relativePath/></parent>
  <groupId>dev.starter</groupId><artifactId>backend</artifactId><version>0.0.1-SNAPSHOT</version>
  <properties><java.version>21</java.version></properties>
  <dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc</artifactId></dependency></dependencies>
  <build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>
</project>
`,
    'backend/src/main/java/dev/starter/Application.java': `package dev.starter;

import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
`,
  },
};

const backendInstructions = {
  'backend-apis/fastapi': 'Install Python 3, then in `backend` create and activate a virtual environment, run `python -m pip install -r requirements.txt`, and start with `fastapi dev main.py`.',
  'backend-apis/fastify': 'Install Node.js, then in `backend` run `npm install` and `npm start`.',
  'backend-apis/spring-boot': 'Install JDK 21 and Maven, then in `backend` run `mvn spring-boot:run`.',
};
const frontendInstructions = {
  'frontend/astro': 'npm run dev',
  'frontend/nextjs': 'npm run dev',
  'frontend/angular': 'npm start',
};

const lines = [
  `# ${name}`,
  '',
  `Project scope: ${stack.scope}`,
  '',
  '## Generated starters',
  '',
  'These are independent starting points, not a fully integrated or production-ready application.',
];
if (stack.primary.frontend) {
  lines.push(`- Frontend: generated in \`frontend/\`. Install a supported Node.js version, then run \`npm install\` and \`${frontendInstructions[stack.primary.frontend]}\` in that directory.`);
}
if (stack.primary.backend) {
  lines.push(`- API: generated in \`backend/\`. ${backendInstructions[stack.primary.backend]}`);
}
if (!stack.primary.frontend && !stack.primary.backend) {
  lines.push('- No frontend or API framework was selected; no application starter was generated.');
}
lines.push('', '## Manual setup for selected technologies', '',
  'The selected tools below are not automatically integrated, configured, or provisioned. Follow each guide to install or provision the tool, configure it for your project, and verify the integration. Accounts, credentials, and deployment settings may be required. Do not put secrets in source control.', '');
for (const role of stack.roles) {
  lines.push(`### ${role.title}`, '');
  for (const tool of role.tools) {
    const primary = stack.primary[role.id] === tool.id ? ' (primary choice)' : '';
    lines.push(`- ${tool.title}${primary}: [setup guide](${tool.url}).`);
  }
  lines.push('');
}
lines.push('Review compatibility between your chosen language/runtime and each framework. The frontend and API are not connected automatically.', '');

try {
  write('README.md', lines.join('\n'));
  write('.gitignore', 'node_modules/\n.venv/\n__pycache__/\n.env\n.env.*\n!.env.example\ndist/\ntarget/\n');
  if (stack.primary.backend) {
    for (const [path, content] of Object.entries(backendFiles[stack.primary.backend])) {
      write(path, content);
    }
  }
  if (stack.primary.frontend) {
    runNpx(frontendCommands[stack.primary.frontend]);
  }
  console.log(`Created ${root}. Read README.md for installation and manual integration steps.`);
} catch (error) {
  console.error(`Bootstrap failed: ${error.message}. Partial files remain in ${root}; review them before retrying.`);
  process.exit(1);
}
