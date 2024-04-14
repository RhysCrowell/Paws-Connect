const db = require("../../../helper_files/database");
const router = require("express").Router();


async function fetchZipcodeAndUpdate(zipcode, userId) {
	const apiKey = 'e700389f30b100907f2332b17bfea4c9';
	const url = `https://api.openweathermap.org/geo/1.0/zip?zip=${zipcode},us&appid=${apiKey}`;

	const reply = await fetch(url);
	if (reply.message) {
		return null;
	}
	const latitude = reply.lat;
	const longitude = reply.lon;

	const sql = `
		INSERT INTO
			location_lat_long (
				user_id,
				latitude,
				longitude
			)
		VALUES (
			?,
			?,
			?
		)
		ON DUPLICATE KEY UPDATE
    		latitude = VALUES(latitude),
    		longitude = VALUES(longitude)
		;`;

	const params = [userId, latitude, longitude];
	
	const databaseResult = await db.executeSQL(sql, params);

	console.log(databaseResult);

	return {latitude, longitude};
}


// Create a user profile
router.post("/create", async (req, res) => {
	const { username, displayName, profilePicture, birthDate, zip, language } = req.body;
  
	if (!zip) {
		return res.json({
			success: false,
			message: "No zipcode provided. Please enter a zipcode to complete profile creation."
		});
	}

	const user = await db.executeSQL(`
		SELECT
			user_id
		FROM
			user_account
		WHERE
			username = ?`
		, [username]);
	
	if (user.length == 0) {
		res.json({
			"profileCreated": false,
			"message": "invalid username"
		});
		return;
	}

	const locationData = await fetchZipcodeAndUpdate(zip, user[0].user_id);

	if (!locationData) {
		res.json({
			"profileCreated": false,
			"message": "invalid location"
		});
		return;
	}

	// Insert user profile data
	try {
		const result = await db.executeSQL(`
			INSERT INTO
				user_profile (
					user_id,
					birth_date,
					display_name,
					profile_picture,
					zip,
					preferred_language
				)
			SELECT
				user_id,
				?,
				?,
				?,
				?,
				?
			FROM
				user_account
			WHERE
				username = ?`,
			[
				birthDate,
				displayName,
				profilePicture,
				zip,
				language,
				username
			]
		);
	} catch (error) {
		res.json({
			"profileCreated": false,
			"message": "user already has a profile"
		});
		return;
	}

	res.json({
		"profileCreated": true
	});
});

// Retrieve a user's profile data
router.get("/:userId", async (req, res) => {
    const userId = req.params.userId;

    // Run an SQL query to get profile data of the user
    const sql = `
    SELECT a.username, p.display_name, p.profile_picture, p.zip, p.preferred_language, DATE_FORMAT(p.birth_date, "%Y-%m-%d") "birth_date"
    FROM user_profile p
    JOIN user_account a ON (p.user_id = a.user_id)
    WHERE a.user_id=?
    `;
    const rows = await db.executeSQL(sql, [userId]);

    console.log(rows);
    // Check that the user exists
    if (rows.length == 0) { 
      res.json({
		  accountFound: false,
		  message: `User with user ID ${userId} does not have a profile`
	  });
      return;
    }

    // Send the user's profile data back to the frontend
    res.json({
		"accountFound": true,
		"username": rows[0].username,
		"displayName": rows[0].display_name,
		"profilePicture": rows[0].profile_picture,
		"zip": rows[0].zip,
		"preferredLanguage": rows[0].preferred_language,
		"birthDate": rows[0].birth_date
    });
});
  
// Edit the user's profile with their input information
router.put("/edit", async (req, res) => {
    const userId = req.body.userId;
    const displayName = req.body.displayName;
    const profilePicture = req.body.profilePicture;
    const zip = req.body.zip;
    const preferredLanguage = req.body.preferredLanguage;
    const birthDate = req.body.birthDate;
  
	if (fetchZipcodeAndUpdate(zip, userId) == null) {
		res.json({
			"accountUpdated": false,
			"message": "Invalid zip code"
		})
		return;
	}

    const sql = `
		UPDATE
			user_profile
		SET
			display_name=?,
			profile_picture=?,
			zip=?,
			preferred_language=?,
			birth_date=?
		WHERE
			user_id=?
	`;
    rows = await db.executeSQL(sql, [displayName, profilePicture, zip, preferredLanguage, birthDate, userId]);
    console.log(rows);
  
    res.json({
      "accountUpdated": rows.affectedRows > 0
    });
});
module.exports = router;