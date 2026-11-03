"""Run the repository checks shared by local work and GitHub Actions."""

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent


def git(*args: str, data: bytes | None = None) -> bytes:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout


def main() -> int:
    try:
        git_root = Path(git("rev-parse", "--show-toplevel").decode().strip())
        if git_root.resolve() != ROOT:
            print("Git root must be this project directory.", file=sys.stderr)
            return 1
        if not git("ls-files", "-z"):
            print("No tracked files. Stage intended files before checking.", file=sys.stderr)
            return 1
        empty_tree = git("hash-object", "-w", "-t", "tree", "--stdin", data=b"")
        git("diff", "--check", empty_tree.decode().strip(), "--")
    except subprocess.CalledProcessError as error:
        output = error.stdout + error.stderr
        sys.stderr.write(output.decode("utf-8", errors="replace"))
        return error.returncode
    print("Repository whitespace checks passed. Application checks are not configured.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
