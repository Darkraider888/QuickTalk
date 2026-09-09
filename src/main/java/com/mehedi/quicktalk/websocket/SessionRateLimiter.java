package com.mehedi.quicktalk.websocket;


import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;


public final class SessionRateLimiter {


    // =====================================================
    // EVENT HISTORY
    // =====================================================

    private final Map<
            String,
            Deque<Long>
            > eventHistory =
            new HashMap<>();


    // =====================================================
    // ALLOW EVENT?
    // =====================================================

    public synchronized boolean allow(
            String key,
            int maximumEvents,
            long windowMilliseconds) {


        if (
                key == null
                        ||
                        key.isBlank()
                        ||
                        maximumEvents <= 0
                        ||
                        windowMilliseconds <= 0
        ) {

            return false;
        }


        /*
         * nanoTime is useful here because rate limiting
         * only needs elapsed time, not actual clock time.
         */

        long now =
                System.nanoTime();


        long windowNanoseconds =
                windowMilliseconds
                        * 1_000_000L;


        long cutoff =
                now
                        -
                        windowNanoseconds;


        Deque<Long> timestamps =
                eventHistory
                        .computeIfAbsent(
                                key,
                                ignored ->
                                        new ArrayDeque<>()
                        );


        // =================================================
        // REMOVE OLD EVENTS
        // =================================================

        while (
                !timestamps.isEmpty()
                        &&
                        timestamps.peekFirst()
                                <= cutoff
        ) {

            timestamps.removeFirst();
        }


        // =================================================
        // LIMIT REACHED
        // =================================================

        if (
                timestamps.size()
                        >= maximumEvents
        ) {

            return false;
        }


        // =================================================
        // ALLOW + RECORD
        // =================================================

        timestamps.addLast(
                now
        );


        return true;
    }


    // =====================================================
    // CLEANUP
    // =====================================================

    public synchronized void clear() {

        eventHistory.clear();
    }
}