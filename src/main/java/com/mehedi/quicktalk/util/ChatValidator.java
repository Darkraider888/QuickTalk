package com.mehedi.quicktalk.util;


public final class ChatValidator {


    private ChatValidator() {
    }


    // =====================================================
    // USERNAME
    // =====================================================

    public static boolean isValidName(
            String name) {


        if (name == null) {

            return false;
        }


        String cleaned =
                name.trim();


        if (
                cleaned.isBlank()
                        ||
                        cleaned.length() > 30
        ) {

            return false;
        }


        return !containsUnsafeCharacters(
                cleaned
        );
    }


    // =====================================================
    // ROOM NAME
    // =====================================================

    public static boolean isValidRoom(
            String room) {


        if (room == null) {

            return false;
        }


        String cleaned =
                room.trim();


        if (
                cleaned.isBlank()
                        ||
                        cleaned.length() > 40
        ) {

            return false;
        }


        /*
         * Room URLs remain simple and predictable.
         *
         * Allowed:
         *
         * java-room
         * CSE_321
         * ABC123
         */

        return cleaned.matches(
                "[A-Za-z0-9_-]+"
        );
    }


    // =====================================================
    // MESSAGE
    // =====================================================

    public static boolean isValidMessage(
            String message) {


        if (message == null) {

            return false;
        }


        String cleaned =
                message.trim();


        if (
                cleaned.isBlank()
                        ||
                        cleaned.length() > 500
        ) {

            return false;
        }


        /*
         * QuickTalk currently uses a single-line
         * message composer.
         *
         * Therefore raw control characters have
         * no legitimate purpose in chat messages.
         */

        return !containsUnsafeCharacters(
                cleaned
        );
    }


    // =====================================================
    // UNSAFE / INVISIBLE CHARACTER CHECK
    // =====================================================

    private static boolean containsUnsafeCharacters(
            String text) {


        for (
                int index = 0;
                index < text.length();
                index++
        ) {

            char character =
                    text.charAt(
                            index
                    );


            // -------------------------------------------------
            // NORMAL CONTROL CHARACTERS
            // -------------------------------------------------

            if (
                    Character.isISOControl(
                            character
                    )
            ) {

                return true;
            }


            // -------------------------------------------------
            // INVISIBLE FORMAT CHARACTERS
            //
            // Helps prevent usernames containing things like
            // zero-width or bidi-formatting characters.
            // -------------------------------------------------

            if (
                    Character.getType(
                            character
                    )
                            ==
                            Character.FORMAT
            ) {

                return true;
            }
        }


        return false;
    }
}