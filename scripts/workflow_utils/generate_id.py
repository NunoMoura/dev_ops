#!/usr/bin/env python3
import os
import sys

# Add project root to sys.path
sys.path.append(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)

from scripts.shared_utils.id_gen import get_next_id


def main():
    if len(sys.argv) < 2:
        print("Usage: generate_id.py <type> [directory]")
        sys.exit(1)

    doc_type = sys.argv[1].upper()

    # Default directories
    base_dir = os.path.join(
        os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ),
        "dev_ops",
    )

    type_map = {
        "ADR": os.path.join(base_dir, "adrs"),
        "RES": os.path.join(base_dir, "research"),
        "BUG": os.path.join(base_dir, "bugs"),
        "BCK": os.path.join(base_dir, "backlog"),
        "PLN": os.path.join(base_dir, "plans"),
    }

    if len(sys.argv) > 2:
        directory = sys.argv[2]
    else:
        directory = type_map.get(doc_type)
        if not directory:
            print(f"Unknown type: {doc_type}. Known types: {list(type_map.keys())}")
            sys.exit(1)

    print(get_next_id(doc_type, directory))


if __name__ == "__main__":
    main()
