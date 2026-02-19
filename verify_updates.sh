#!/bin/bash
set -e

# Setup paths
PROJECT_ROOT="/home/nunoc/projects/dev_ops"
SCRIPTS_DIR="$PROJECT_ROOT/payload/skills/devops/scripts"

# Helper for running scripts
run_script() {
    "$SCRIPTS_DIR/$1" "${@:2}"
}

echo "Starting Verification..."

# 1. Create a Test Task
# We use the raw CLI JS for creation as we didn't make a wrapper for create-task, or maybe there is one?
# The user complained about missing scripts. `create-task.sh` existed in the initial list!
# "create-task.sh" was listed in Step 0 request.
echo "Creating test task..."
TASK_OUTPUT=$(run_script "create-task.sh" --title "Verification Task" --summary "Testing update capability")
TASK_ID=$(echo "$TASK_OUTPUT" | grep -o 'TASK-[0-9]*' | head -n1)
echo "Created: $TASK_ID"

# 2. Verify Initial State
echo "Verifying initial state..."
run_script "read-task.sh" --id "$TASK_ID" > task_initial.json
cat task_initial.json

# 3. Update Task (Add Checklist)
echo "Updating task (adding checklist)..."
run_script "update-task.sh" --id "$TASK_ID" --add-checklist "Check Item A"

# 4. Verify Update
echo "Verifying update..."
run_script "read-task.sh" --id "$TASK_ID" > task_updated.json
if grep -q "Check Item A" task_updated.json; then
    echo "Checklist item added successfully."
else
    echo "FAILED to add checklist item."
    exit 1
fi

# 5. Check Item
echo "Checking item..."
run_script "update-task.sh" --id "$TASK_ID" --check-item "Check Item A"

# 6. Verify Check
echo "Verifying check..."
run_script "read-task.sh" --id "$TASK_ID" > task_checked.json
if grep -q '"done": true' task_checked.json; then
    echo "Checklist item marked done successfully."
else
    echo "FAILED to mark item done."
    exit 1
fi

# 7. List Tasks
echo "Listing tasks..."
run_script "list-tasks.sh" --status "todo"

echo "Verification Complete!"
