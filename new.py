def convert_to_list(output):
    return [line.strip() for line in output.split("\n") if line.strip()]

# Example input
output = """eula.txt
libraries
logs
server.jar
server.properties
versions"""

# Convert to list
file_list = convert_to_list(output)

# Print the result
print(file_list)