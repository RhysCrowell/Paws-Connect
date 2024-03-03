SET REFERENTIAL_INTEGRITY FALSE;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS user_friends;
DROP TABLE IF EXISTS language;
DROP TABLE IF EXISTS breed;
DROP TABLE IF EXISTS user;
SET REFERENTIAL_INTEGRITY TRUE;

CREATE TABLE user (
    ID INT NOT NULL PRIMARY KEY,
    username VARCHAR(250) NOT NULL,
    passcode VARCHAR(250) NOT NULL,
    isAdmin BOOLEAN NOT NULL,
    displayname VARCHAR(250),
    profilePictureRef VARCHAR(250),
    locationOfChoice VARCHAR(250),
    preferredLanguage VARCHAR(100),
    CONSTRAINT check_language CHECK(preferredLanguage IN ('English', 'Spanish', 
    'French', 'German', 'Simplified Chinese', 'Hindi'))
);

CREATE TABLE pets (
    petsID INT NOT NULL PRIMARY KEY,
    userID INT, 
    petname VARCHAR(250) NOT NULL,
    petPictureRef VARCHAR(250),
    breed VARCHAR(100), 
    color VARCHAR(100),
    age INT,
    FOREIGN KEY (userID) REFERENCES user(ID) 
);

CREATE TABLE user_friends (
    userID INT NOT NULL,
    friendID INT NOT NULL,
    PRIMARY KEY (userID, friendID),
    FOREIGN KEY (userID) REFERENCES user(ID),
    FOREIGN KEY (friendID) REFERENCES user(ID)
);

CREATE TABLE language(
    languageID INT NOT NULL PRIMARY KEY,
    languageSelect VARCHAR(50)
    FOREIGN KEY (languageSelect) REFERENCES user(preferredLanguage)
);

CREATE TABLE breed(
    breedID INT NOT NULL PRIMARY KEY, 
    breedName VARCHAR(100)
);