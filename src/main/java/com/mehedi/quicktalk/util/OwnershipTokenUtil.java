package com.mehedi.quicktalk.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;


public final class OwnershipTokenUtil {


    private static final Pattern TOKEN_PATTERN =
            Pattern.compile(
                    "^[A-Fa-f0-9]{64}$"
            );


    private static final Pattern OWNER_ID_PATTERN =
            Pattern.compile(
                    "^[a-f0-9]{64}$"
            );


    private OwnershipTokenUtil() {
    }


    // =====================================================
    // VALIDATE PRIVATE TOKEN
    // =====================================================

    public static boolean isValidToken(
            String token) {

        if (token == null) {
            return false;
        }


        return TOKEN_PATTERN
                .matcher(
                        token.trim()
                )
                .matches();
    }


    // =====================================================
    // VALIDATE HASHED OWNER ID
    // =====================================================

    public static boolean isValidOwnerId(
            String ownerId) {

        if (ownerId == null) {
            return false;
        }


        return OWNER_ID_PATTERN
                .matcher(
                        ownerId.trim()
                )
                .matches();
    }


    // =====================================================
    // SHA-256 TOKEN
    // =====================================================

    public static String hashToken(
            String token) {


        if (!isValidToken(token)) {

            throw new IllegalArgumentException(
                    "Invalid ownership token."
            );
        }


        try {

            MessageDigest digest =
                    MessageDigest.getInstance(
                            "SHA-256"
                    );


            byte[] hash =
                    digest.digest(
                            token
                                    .trim()
                                    .getBytes(
                                            StandardCharsets.UTF_8
                                    )
                    );


            return HexFormat
                    .of()
                    .formatHex(
                            hash
                    );


        } catch (NoSuchAlgorithmException exception) {

            throw new IllegalStateException(
                    "SHA-256 is not available.",
                    exception
            );
        }
    }
}