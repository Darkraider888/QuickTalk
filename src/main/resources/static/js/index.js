// ======================================================
// QUICKTALK - LANDING PAGE
// ======================================================


const joinForm =
    document.getElementById(
        "joinForm"
    );


const nameInput =
    document.getElementById(
        "name"
    );


const roomInput =
    document.getElementById(
        "room"
    );


const randomRoomButton =
    document.getElementById(
        "randomRoomButton"
    );


// ======================================================
// NORMAL ROOM JOIN
// ======================================================

joinForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const name =
            nameInput.value.trim();


        let room =
            roomInput.value.trim();


        // ----------------------------------------------
        // CHECK NAME
        // ----------------------------------------------

        if (name === "") {

            nameInput.focus();

            return;
        }


        if (name.length > 30) {

            alert(
                "Name cannot be longer than 30 characters."
            );

            nameInput.focus();

            return;
        }


        // ----------------------------------------------
        // CHECK ROOM
        // ----------------------------------------------

        if (room === "") {

            roomInput.focus();

            return;
        }


        room =
            cleanRoomName(
                room
            );


        if (room === "") {

            alert(
                "Please enter a valid room name."
            );

            roomInput.focus();

            return;
        }


        // ----------------------------------------------
        // SAVE TEMPORARY USERNAME
        // ----------------------------------------------

        sessionStorage.setItem(
            "quicktalkName",
            name
        );


        // ----------------------------------------------
        // OPEN ROOM
        // ----------------------------------------------

        window.location.href =
            "/room/"
            + encodeURIComponent(
                room
            );
    }
);


// ======================================================
// CREATE RANDOM ROOM
// ======================================================

randomRoomButton.addEventListener(
    "click",
    function () {

        const name =
            nameInput.value.trim();


        // User must provide a name first
        if (name === "") {

            alert(
                "Enter your name first."
            );

            nameInput.focus();

            return;
        }


        if (name.length > 30) {

            alert(
                "Name cannot be longer than 30 characters."
            );

            nameInput.focus();

            return;
        }


        // Create random room
        const randomRoom =
            generateRoomCode();


        // Save temporary name
        sessionStorage.setItem(
            "quicktalkName",
            name
        );


        // Open generated room
        window.location.href =
            "/room/"
            + randomRoom;
    }
);


// ======================================================
// CLEAN ROOM NAME
// ======================================================

function cleanRoomName(
    room
) {

    return room

        // Make normal room names consistent
        .toLowerCase()

        // Spaces become dash
        .replace(
            /\s+/g,
            "-"
        )

        // Only safe room characters
        .replace(
            /[^a-z0-9-_]/g,
            ""
        )

        // Remove repeated dashes
        .replace(
            /-+/g,
            "-"
        )

        // Remove dash at beginning/end
        .replace(
            /^-+|-+$/g,
            ""
        )

        // Backend maximum
        .substring(
            0,
            40
        );
}


// ======================================================
// RANDOM ROOM GENERATOR
// ======================================================

function generateRoomCode() {

    /*
        Characters 0, O, 1 and I are intentionally
        removed because they can look similar.
    */

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let result =
        "";


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const randomIndex =
            Math.floor(
                Math.random()
                * characters.length
            );


        result +=
            characters[
                randomIndex
                ];
    }


    return result;
}