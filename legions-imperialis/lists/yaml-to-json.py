import sys, yaml, json;


def merge(dicts):

    result = {}
    for d in dicts:
        result = deep_merge(result, d)
    return result

def load_yamls(filenames):
    yamls = []
    for filename in filenames:
        with open(filename, 'r') as f:
            yamls.append(yaml.safe_load(f))
    return yamls

def write_json(j):
    print(json.dumps(j, indent=2))

def deep_merge(dict1, dict2):
    """Merge two dictionaries, including nested dictionaries."""
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result:
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            else:
                result[key] = value
        else:
            result[key] = value
    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python yaml-to-json.py <input_file> [..<input_file] > <output_file>")
        sys.exit(1)
    
    input_files = sys.argv[1:]

    yamls = load_yamls(input_files)
    merged = merge(yamls)
    write_json(merged)