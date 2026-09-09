package com.mehedi.quicktalk.websocket;


import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;


class SessionRateLimiterTest {


    @Test
    void eventsInsideLimitShouldPass() {

        SessionRateLimiter limiter =
                new SessionRateLimiter();


        assertTrue(
                limiter.allow(
                        "message",
                        3,
                        1000
                )
        );


        assertTrue(
                limiter.allow(
                        "message",
                        3,
                        1000
                )
        );


        assertTrue(
                limiter.allow(
                        "message",
                        3,
                        1000
                )
        );
    }


    @Test
    void eventAboveLimitShouldFail() {

        SessionRateLimiter limiter =
                new SessionRateLimiter();


        assertTrue(
                limiter.allow(
                        "reaction",
                        2,
                        1000
                )
        );


        assertTrue(
                limiter.allow(
                        "reaction",
                        2,
                        1000
                )
        );


        assertFalse(
                limiter.allow(
                        "reaction",
                        2,
                        1000
                )
        );
    }


    @Test
    void differentActionsShouldHaveSeparateLimits() {

        SessionRateLimiter limiter =
                new SessionRateLimiter();


        assertTrue(
                limiter.allow(
                        "message",
                        1,
                        1000
                )
        );


        assertFalse(
                limiter.allow(
                        "message",
                        1,
                        1000
                )
        );


        /*
         * Reaction uses a different bucket.
         */
        assertTrue(
                limiter.allow(
                        "reaction",
                        1,
                        1000
                )
        );
    }


    @Test
    void clearShouldResetLimiter() {

        SessionRateLimiter limiter =
                new SessionRateLimiter();


        assertTrue(
                limiter.allow(
                        "message",
                        1,
                        1000
                )
        );


        assertFalse(
                limiter.allow(
                        "message",
                        1,
                        1000
                )
        );


        limiter.clear();


        assertTrue(
                limiter.allow(
                        "message",
                        1,
                        1000
                )
        );
    }
}