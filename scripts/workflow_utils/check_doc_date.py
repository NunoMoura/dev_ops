#!/usr/bin/env python3
import sys
import os
import argparse
import subprocess
from datetime import datetime


def get_git_commit_date(filepath):
    """Get the last commit date of a file using git."""
    try:
        # Get the directory of the file to run git command in that context
        dirname = os.path.dirname(os.path.abspath(filepath))
        basename = os.path.basename(filepath)

        result = subprocess.run(
            ["git", "log", "-1", "--format=%cd", "--date=iso-strict", basename],
            cwd=dirname,
            capture_output=True,
            text=True,
            check=True,
        )
        date_str = result.stdout.strip()
        if date_str:
            return datetime.fromisoformat(date_str).timestamp()
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        pass
    return None


def get_file_mtime(filepath):
    """Get the modification time of a file."""
    try:
        return os.path.getmtime(filepath)
    except OSError as e:
        print(f"Error accessing file {filepath}: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Check and compare file modification dates (Git commit date takes precedence)."
    )
    parser.add_argument("files", nargs="+", help="List of files to check.")
    args = parser.parse_args()

    files_data = []
    for filepath in args.files:
        # Try git date first
        mtime = get_git_commit_date(filepath)
        source = "Git"

        # Fallback to filesystem mtime
        if mtime is None:
            mtime = get_file_mtime(filepath)
            source = "FS"

        if mtime is not None:
            files_data.append((filepath, mtime, source))

    if not files_data:
        print("No valid files found.")
        sys.exit(1)

    # Sort by modification time, newest first
    files_data.sort(key=lambda x: x[1], reverse=True)

    print("Files sorted by date (newest first):")
    for filepath, mtime, source in files_data:
        dt = datetime.fromtimestamp(mtime)
        print(f"{dt.strftime('%Y-%m-%d %H:%M:%S')} ({source}) - {filepath}")

    if len(files_data) > 1:
        newest_file = files_data[0][0]
        print(f"\nThe most recent file is: {newest_file}")


if __name__ == "__main__":
    main()
