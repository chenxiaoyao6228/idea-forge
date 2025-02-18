// use github cli to delete workflow runs in batch
// delete 30 runs at a time(one page)
// `gh auth login` to login first

const { execSync } = require("child_process");

// Repository details
const OWNER = "chenxiaoyao6228";
const REPO = "idea-forge";

async function deleteWorkflowRuns() {
  try {
    // Get all workflow runs and extract run IDs
    console.log("Fetching workflow runs...");
    const runsData = execSync(
      `gh api -H "Accept: application/vnd.github+json" /repos/${OWNER}/${REPO}/actions/runs`,
    ).toString();

    const runs = JSON.parse(runsData);
    const runIds = runs.workflow_runs.map((run) => run.id);

    // Check if there are any runs
    if (runIds.length === 0) {
      console.log("No workflow runs found.");
      return;
    }

    // Delete each run
    console.log("Deleting workflow runs...");
    for (const runId of runIds) {
      console.log(`Deleting run ID: ${runId}`);
      execSync(
        `gh api --method DELETE /repos/${OWNER}/${REPO}/actions/runs/${runId}`,
      );
    }

    console.log("All workflow runs have been deleted.");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

deleteWorkflowRuns();
