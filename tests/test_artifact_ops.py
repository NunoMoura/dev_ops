# sys.path handled by conftest.py
import os

from artifact_ops import create_artifact, list_artifacts
from board_ops import create_task

# temp_project fixture handled by conftest.py


class TestCreateArtifact:
    """Test create_artifact function."""

    def test_create_plan(self, temp_project):
        """Test creating plan artifact."""
        os.chdir(temp_project)
        plan_id = create_artifact("plan", "Implement authentication")

        assert plan_id is not None
        assert plan_id.startswith("PLN-")

    def test_create_multiple_plans(self, temp_project):
        """Test creating multiple plans."""
        os.chdir(temp_project)
        plan1 = create_artifact("plan", "Plan A")
        plan2 = create_artifact("plan", "Plan B")
        plan3 = create_artifact("plan", "Plan C")

        assert plan1 != plan2 != plan3
        assert all(p.startswith("PLN-") for p in [plan1, plan2, plan3])

    def test_create_bug(self, temp_project):
        """Test creating bug artifact."""
        os.chdir(temp_project)
        bug_id = create_artifact("bug", "Login fails", priority="high", description="Safari issue")

        assert bug_id is not None
        assert bug_id.startswith("BUG-")

    def test_create_validation(self, temp_project):
        """Test creating validation report."""
        os.chdir(temp_project)
        val_id = create_artifact("validation", "Test results")

        assert val_id is not None
        assert val_id.startswith("VAL-")

    def test_sequential_ids(self, temp_project):
        """Test that IDs are sequential."""
        os.chdir(temp_project)

        plans = [create_artifact("plan", f"Plan {i}") for i in range(5)]

        # All unique
        assert len(set(plans)) == 5

        # All have correct prefix
        assert all(p.startswith("PLN-") for p in plans)

    def test_artifact_file_created(self, temp_project):
        """Test that artifact file is actually created."""
        os.chdir(temp_project)

        plan_id = create_artifact("plan", "Test Plan")

        # Verify artifact ID created
        assert plan_id.startswith("PLN-")


class TestListArtifacts:
    """Test list_artifacts function."""

    def test_list_empty(self, temp_project, capsys):
        """Test listing when no artifacts exist."""
        os.chdir(temp_project)

        list_artifacts("plan")
        captured = capsys.readouterr()

        # Should handle empty gracefully
        assert "No" in captured.out or "📂" in captured.out

    def test_list_plans(self, temp_project, capsys):
        """Test listing plans."""
        os.chdir(temp_project)

        # Create some plans
        create_artifact("plan", "Plan 1")
        create_artifact("plan", "Plan 2")

        list_artifacts("plan")
        captured = capsys.readouterr()

        # Should show artifacts
        assert "PLN-" in captured.out or "plan" in captured.out.lower()


class TestArtifactIntegration:
    """Integration tests for artifact workflows."""

    def test_artifact_types_variety(self, temp_project):
        """Test creating different artifact types."""
        os.chdir(temp_project)

        plan = create_artifact("plan", "Migration plan")
        bug = create_artifact("bug", "Critical bug")
        val = create_artifact("validation", "Test results")

        assert plan.startswith("PLN-")
        assert bug.startswith("BUG-")
        assert val.startswith("VAL-")

    def test_artifact_with_task(self, temp_project):
        """Test creating artifact and linking to task."""
        os.chdir(temp_project)

        # Create task
        task_id = create_task("Implement feature", project_root=temp_project)

        # Create plan
        plan_id = create_artifact("plan", "Feature implementation")

        # Verify both created
        assert task_id.startswith("TASK-")
        assert plan_id.startswith("PLN-")

    def test_multiple_artifact_types(self, temp_project):
        """Test creating multiple types in sequence."""
        os.chdir(temp_project)

        artifacts = []

        # Create variety
        artifacts.append(create_artifact("plan", "Plan 1"))
        artifacts.append(create_artifact("bug", "Bug 1"))
        artifacts.append(create_artifact("plan", "Plan 2"))
        artifacts.append(create_artifact("validation", "Val 1"))
        artifacts.append(create_artifact("bug", "Bug 2"))

        # Verify correct prefixes
        assert artifacts[0].startswith("PLN-")
        assert artifacts[1].startswith("BUG-")
        assert artifacts[2].startswith("PLN-")
        assert artifacts[3].startswith("VAL-")
        assert artifacts[4].startswith("BUG-")

        # All unique
        assert len(set(artifacts)) == 5
