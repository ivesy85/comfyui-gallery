const { exec, spawn } = require('child_process');

// Utility function to run a shell command and return a child process
function runCommand(command, args) {
    const process = spawn(command, args, { stdio: 'inherit' });

    process.on('error', (err) => {
        console.error(`Error executing ${command}: ${err.message}`);
    });

    return process;
}

// Start Docker containers
const startDocker = () => {
    console.log('Starting Docker containers...');
    runCommand('docker-compose', ['up', 'comfyui-gallery-db', '-d']);
    runCommand('docker-compose', ['up', 'pgadmin', '-d']);
};

// Stop Docker containers on cleanup
const stopDocker = () => {
    console.log('Stopping Docker containers...');
    runCommand('docker-compose', ['stop', 'comfyui-gallery-db']);
    runCommand('docker-compose', ['stop', 'pgadmin']);
};

// Trap SIGINT (Ctrl+C) and SIGTERM (termination) to trigger cleanup
process.on('SIGINT', () => {
    stopDocker();
    process.exit();
});

process.on('SIGTERM', () => {
    stopDocker();
    process.exit();
});

// Start Next.js dev server
const startNextJs = () => {
    console.log('Starting Next.js development server...');
    runCommand('npx', ['next', 'dev']);
};

// Main execution
const main = async () => {
    startDocker();
    startNextJs();
};

main();
