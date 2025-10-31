import os
import platform
import subprocess
import time
import webbrowser

# --- Configuration ---
PORT = 5173
HOST = "localhost"
PROJECT_PATH = "/project"
VITE_COMMAND = ["npm", "run", "dev"]
# Forcing a specific port and auto-opening is better done via command-line args to Vite.
# We add them to the command below.

def find_and_kill_process_on_port(port):
    """
    Finds and kills a process running on a given port, cross-platform.
    """
    system = platform.system()
    try:
        if system == "Windows":
            command = f"netstat -ano | findstr :{port}"
            output = subprocess.check_output(command, shell=True, text=True, stderr=subprocess.DEVNULL)
            if not output:
                print(f"Port {port} is already free.")
                return
            
            pid = output.strip().split()[-1]
            print(f"Process with PID {pid} found on port {port}. Attempting to kill it...")
            subprocess.run(f"taskkill /PID {pid} /F", check=True, text=True, capture_output=True)
            print(f"Successfully killed process {pid}.")
            
        elif system in ["Linux", "Darwin"]: # Darwin is macOS
            command = f"lsof -ti :{port}"
            output = subprocess.check_output(command, shell=True, text=True, stderr=subprocess.DEVNULL)
            if not output:
                print(f"Port {port} is already free.")
                return

            pids = output.strip().split('\n')
            for pid in pids:
                print(f"Process with PID {pid} found on port {port}. Attempting to kill it...")
                subprocess.run(f"kill -9 {pid}", check=True, shell=True, text=True, capture_output=True)
                print(f"Successfully killed process {pid}.")

    except (subprocess.CalledProcessError, subprocess.SubprocessError, FileNotFoundError) as e:
        # This can happen if the port is free (command finds nothing) or if a command is not found.
        if "No such file or directory" in str(e) or (isinstance(e, subprocess.CalledProcessError) and e.returncode == 1):
             print(f"Port {port} appears to be free. No process to kill.")
        else:
            print(f"An error occurred while trying to free port {port}: {e}")

def start_server_and_open_browser():
    """
    Starts the Vite dev server and opens the browser to the project page.
    """
    # Vite's CLI allows specifying port and the page to open directly.
    # We pass these arguments after '--' to the 'npm run dev' script.
    server_command = VITE_COMMAND + ["--", "--port", str(PORT), "--host", HOST]
    
    print(f"\nStarting development server with command: {' '.join(server_command)}")
    
    # We use Popen to run the server as a background process.
    server_process = subprocess.Popen(server_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Give the server a moment to start up.
    print("Waiting for the server to initialize...")
    time.sleep(5) 
    
    # Check if the server started successfully by looking at early output
    # A better approach would be to poll the port, but this is simpler.
    if server_process.poll() is not None:
        print("\n--- Server failed to start! ---")
        stderr_output = server_process.stderr.read()
        print(stderr_output)
        print("-----------------------------")
        return

    url_to_open = f"http://{HOST}:{PORT}{PROJECT_PATH}"
    print(f"Server is running. Opening browser at: {url_to_open}")
    webbrowser.open(url_to_open)
    
    # Print server output continuously
    try:
        # Reading from stdout will block until there is output or the process ends.
        for line in iter(server_process.stdout.readline, ''):
            print(line, end='')
        server_process.stdout.close()
        server_process.wait()
    except KeyboardInterrupt:
        print("\nStopping the development server...")
        server_process.terminate() # or server_process.kill()
        print("Server stopped.")


if __name__ == "__main__":
    find_and_kill_process_on_port(PORT)
    start_server_and_open_browser()
