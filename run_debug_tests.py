import subprocess
import sys


def run_tests():
    print("Running tests...")
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_setup_ops.py",
            "tests/test_board_ops.py",
            "tests/test_git_ops.py",
            "-v",
        ],
        capture_output=True,
        text=True,
    )
    with open("test_output.txt", "w") as f:
        f.write(f"STDOUT:\n{result.stdout}\n")
        f.write(f"STDERR:\n{result.stderr}\n")
        f.write(f"Return Code: {result.returncode}\n")


if __name__ == "__main__":
    run_tests()
