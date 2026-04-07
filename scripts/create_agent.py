import argparse
import re
import shutil
from pathlib import Path


TEXT_EXTENSIONS = {
    ".md",
    ".yaml",
    ".yml",
    ".json",
    ".dart",
    ".ts",
    ".js",
    ".mjs",
    ".c",
    ".cc",
    ".cpp",
    ".h",
    ".hpp",
    ".ps1",
    ".sh",
    ".txt",
    ".env",
    ".example",
    ".rules",
    ".gitignore",
    ".dockerfile",
    ".html",
    ".xml",
    ".rc",
    ".xcconfig",
    ".pbxproj",
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise ValueError("agent name must contain letters or numbers")
    return slug


def bundle_id_for_slug(slug: str) -> str:
    segment = re.sub(r"[^a-z0-9]+", "", slug.lower())
    if not segment:
        segment = "agent"
    return f"dev.gagent.{segment}"


def iter_text_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in TEXT_EXTENSIONS or path.name in {".gitignore", "Dockerfile"}:
            yield path


def replace_tokens(root: Path, replacements: dict[str, str]) -> None:
    for path in iter_text_files(root):
        text = path.read_text(encoding="utf-8")
        updated = text
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated != text:
            path.write_text(updated, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a standalone Flutter + Node agent app.")
    parser.add_argument("name", help="Human-friendly agent name")
    parser.add_argument(
        "--output-root",
        default=".",
        help="Directory where the new project folder will be created (defaults to the current working directory)",
    )
    parser.add_argument("--firebase-project-id", default="your-firebase-project-id")
    parser.add_argument("--cloud-run-url", default="https://your-cloud-run-service.run.app")
    parser.add_argument("--backend-port", default="4318")
    parser.add_argument("--force", action="store_true", help="Replace an existing target directory")
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parent.parent
    template_root = skill_root / "assets" / "templates" / "agent-studio"

    slug = slugify(args.name)
    destination = Path(args.output_root) / slug

    if destination.exists():
        if not args.force:
            raise SystemExit(f"Target already exists: {destination}")
        shutil.rmtree(destination)

    shutil.copytree(template_root, destination)

    replacements = {
        "__AGENT_NAME__": args.name.strip(),
        "__AGENT_SLUG__": slug,
        "__BUNDLE_ID__": bundle_id_for_slug(slug),
        "__FIREBASE_PROJECT_ID__": args.firebase_project_id,
        "__CLOUD_RUN_URL__": args.cloud_run_url,
        "__BACKEND_PORT__": str(args.backend_port),
    }
    replace_tokens(destination, replacements)

    print(f"Created agent project at {destination}")
    print("Next steps:")
    print(f"  1. cd {destination}")
    print("  2. npm install")
    print("  3. cd apps/shell && flutter pub get")
    print("  4. Configure Firebase and OpenAI env vars")
    print("  5. Start the core, then start the Flutter shell")


if __name__ == "__main__":
    main()
