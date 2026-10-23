// Writes the seed venues to src/data/venues.json (for a DB import or other tools).
import { writeFileSync } from "node:fs";
import { venues } from "@/data/venues";
writeFileSync("src/data/venues.json", JSON.stringify(venues, null, 2));
console.log(`Wrote ${venues.length} venues to src/data/venues.json`);
