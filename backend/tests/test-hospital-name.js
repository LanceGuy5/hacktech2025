import { DBWorker } from "../models/database.js";

// List of hospital names to test
const testNames = [
  "Memorial Hospital",
  "St. Mary's Hospital",
  "General Hospital",
  "University Medical Center",
  "This Hospital Doesn't Exist",
  "Thomas Jefferson University",
  "Sono Center",
  "Cotton Medical Center",
];

// Run the tests
async function runTests() {
  try {
    const db = new DBWorker();
    
    console.log("Testing getHospitalByName with multiple inputs:");
    console.log("---------------------------------------------");
    
    for (const name of testNames) {
      console.log(`\nTesting: "${name}"`);
      const result = await db.getHospitalMatch(name);
      
      if (result) {
        console.log(`✅ MATCHED WITH: ${result.name} (ID: ${result.hospital_id})`);
        console.log(`   Beds: ${result.total_beds}, ED: ${result.has_ed ? 'Yes' : 'No'}, Trauma: ${result.is_trauma_center ? 'Yes' : 'No'}`);
        console.log(`   State: ${result.state}, Coordinates: ${result.latitude}, ${result.longitude}`);
      } else {
        console.log(`❌ NO MATCH FOUND`);
      }
    }
    
    console.log("\nAll tests completed.");
  } catch (error) {
    console.error("Error during tests:", error);
  } finally {
    // Exit when done
    process.exit(0);
  }
}

runTests();