package com.mehedi.quicktalk.util;


import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;


class ChatValidatorTest {


    // =====================================================
    // USERNAME
    // =====================================================

    @Test
    void validNameShouldPass() {

        assertTrue(
                ChatValidator.isValidName(
                        "Mehedi"
                )
        );


        assertTrue(
                ChatValidator.isValidName(
                        "Mehedi Hasan"
                )
        );
    }


    @Test
    void emptyNameShouldFail() {

        assertFalse(
                ChatValidator.isValidName(
                        ""
                )
        );


        assertFalse(
                ChatValidator.isValidName(
                        "     "
                )
        );
    }


    @Test
    void longNameShouldFail() {

        assertFalse(
                ChatValidator.isValidName(
                        "A".repeat(
                                31
                        )
                )
        );
    }


    @Test
    void controlCharacterInNameShouldFail() {

        assertFalse(
                ChatValidator.isValidName(
                        "Mehedi\nTest"
                )
        );
    }


    // =====================================================
    // ROOM
    // =====================================================

    @Test
    void validRoomShouldPass() {

        assertTrue(
                ChatValidator.isValidRoom(
                        "java-room"
                )
        );


        assertTrue(
                ChatValidator.isValidRoom(
                        "CSE_321"
                )
        );


        assertTrue(
                ChatValidator.isValidRoom(
                        "ABC123"
                )
        );
    }


    @Test
    void invalidRoomShouldFail() {

        assertFalse(
                ChatValidator.isValidRoom(
                        "hello!!!"
                )
        );


        assertFalse(
                ChatValidator.isValidRoom(
                        "room name"
                )
        );


        assertFalse(
                ChatValidator.isValidRoom(
                        ""
                )
        );
    }


    // =====================================================
    // MESSAGE
    // =====================================================

    @Test
    void validMessageShouldPass() {

        assertTrue(
                ChatValidator.isValidMessage(
                        "Hello QuickTalk!"
                )
        );


        assertTrue(
                ChatValidator.isValidMessage(
                        "Java is working 👍"
                )
        );
    }


    @Test
    void emptyMessageShouldFail() {

        assertFalse(
                ChatValidator.isValidMessage(
                        ""
                )
        );


        assertFalse(
                ChatValidator.isValidMessage(
                        "      "
                )
        );
    }


    @Test
    void messageOver500CharactersShouldFail() {

        assertFalse(
                ChatValidator.isValidMessage(
                        "A".repeat(
                                501
                        )
                )
        );
    }


    @Test
    void controlCharacterInMessageShouldFail() {

        assertFalse(
                ChatValidator.isValidMessage(
                        "Hello\u0000World"
                )
        );
    }
}