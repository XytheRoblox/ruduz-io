import sys

def edit_file(file_name, new_content):
    try:
        # Convert escaped `\n` into actual new lines
        formatted_content = new_content.replace("\\n", "\n")

        # Write to file
        with open(file_name, "w", encoding="utf-8") as file:
            file.write(formatted_content)

        print(f"File '{file_name}' updated successfully.")

    except Exception as e:
        print(f"Error updating file: {e}")

# Ensure arguments are provided
if len(sys.argv) != 3:
    print("Usage: python edit_file.py <file_name> <new_content>")
    sys.exit(1)

# Read command-line arguments
file_name = sys.argv[1]
new_content = sys.argv[2]

# Run the function
edit_file(file_name, new_content)
