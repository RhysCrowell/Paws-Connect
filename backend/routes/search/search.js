const db = require("../../helper_files/database");
const router = require("express").Router();
const geolib = require('geolib');

// Search pet profiles
router.get("/pet", async (req, res) => {
    const { petId = "", petName = "", distance = ""} = req.query;

    const searcherID = req.body.userID;
    
    if (!searcherID) {
        return res.status(400).send("User ID is required for searching pet profiles.");
    }

    try {
        // Fetch the searcher's location from the database.
        const [searcherLocation] = await db.executeSQL(
            `SELECT latitude, longitude FROM location_lat_long WHERE user_id = ?`, [searcherID]
        );

        if (!searcherLocation) {
            return res.status(404).send("Searcher's location not found.");
        }

        // Construct the SQL query to search for pets based on the owner's location.
        let sql = `
        SELECT p.pet_id, p.name, p.profile_picture, p.species, p.breed, p.color, p.birth_date, 
               lll.latitude AS owner_latitude, lll.longitude AS owner_longitude
        FROM pet_profile p
        INNER JOIN user_account u ON p.owner_user_id = u.user_id
        INNER JOIN location_lat_long lll ON u.user_id = lll.user_id
        WHERE (p.pet_id = ? OR p.name LIKE ?)`;

        const params = [petId, `%${petName}%`];
        const petRows = await db.executeSQL(sql, params);

        // Convert the distance from miles to meters for geolib.
        const maxDistanceMeters = distance ? distance * 1609.34 : Number.MAX_SAFE_INTEGER;

        // Filter the search results based on distance from the searcher's location.
        const filteredPets = petRows.filter(pet => {
            return geolib.getDistance(
                { latitude: searcherLocation.latitude, longitude: searcherLocation.longitude },
                { latitude: pet.owner_latitude, longitude: pet.owner_longitude }
            ) <= maxDistanceMeters;
        });

        res.json(filteredPets);
    } catch (error) {
        console.error("Error executing pet profile search:", error);
        res.status(500).send("An error occurred while fetching pet profiles.");
    }
});
// Search user profiles
router.get("/user", async (req, res) => {
    const { username = "", displayName = "", distance = ""} = req.query;
    const searcherID = req.body.userID; // Using user_id from query parameters

    // Ensure that a searcher ID is provided
    if (!searcherID) {
        return res.status(400).send("User ID is required for searching user profiles.");
    }

    try {
        // Fetch the searcher's location from the location_lat_long table
        const [searcherLocation] = await db.executeSQL(
            `SELECT latitude, longitude FROM location_lat_long WHERE user_id = ?`, [searcherID]
        );

        // If the searcher's location is not found, return a 404 error
        if (!searcherLocation) {
            return res.status(404).send("Searcher's location not found.");
        }

        // Construct the SQL query to search for user profiles using the zipcode column
        let sql = `
        SELECT u.username, up.display_name, up.profile_picture, up.zip, lll.latitude, lll.longitude
        FROM user_account u
        JOIN user_profile up ON u.user_id = up.user_id
        JOIN location_lat_long lll ON u.user_id = lll.user_id
        WHERE (u.username LIKE ? OR up.display_name LIKE ?)`;

        const params = [`%${username}%`, `%${displayName}%`];
        const rows = await db.executeSQL(sql, params);

        // Convert the provided distance from miles to meters if a distance is provided
        let filteredRows = rows;
        if (distance) {
            const maxDistanceMeters = distance * 1609.34;
            // Filter the user profiles based on the distance to the searcher's location
            filteredRows = rows.filter(row => {
                return geolib.getDistance(
                    { latitude: searcherLocation.latitude, longitude: searcherLocation.longitude },
                    { latitude: row.latitude, longitude: row.longitude }
                ) <= maxDistanceMeters;
            });
        }

        res.json(filteredRows);
    } catch (error) {
        console.error("Error executing user profile search:", error);
        res.status(500).send("An error occurred while fetching user profiles.");
    }
});
module.exports = router;
