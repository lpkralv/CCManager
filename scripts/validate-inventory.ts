import { readFileSync } from "node:fs";
import { validateInventory } from "../src/index.js";

const inventoryPath = new URL("../data/inventory.json", import.meta.url);
const rawData = JSON.parse(readFileSync(inventoryPath, "utf-8"));

try {
  const inventory = validateInventory(rawData);
  console.log("✓ Inventory validation successful!");
  console.log(`  Version: ${inventory.version}`);
  console.log(`  Last Updated: ${inventory.lastUpdated.toISOString()}`);
  console.log(`  Projects: ${inventory.projects.length}`);

  for (const project of inventory.projects) {
    console.log(`\n  Project: ${project.name}`);
    console.log(`    Type: ${project.projectType}`);
    console.log(`    Status: ${project.status}`);
    console.log(`    Language: ${project.technology.primaryLanguage}`);
    console.log(`    Has CLAUDE.md: ${project.metadata.hasClaudeMd}`);
  }
} catch (error) {
  console.error("✗ Inventory validation failed:");
  console.error(error);
  process.exit(1);
}
