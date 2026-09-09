package com.mehedi.quicktalk.model;


import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;


class ChatMessageTest {


    private ChatMessage createMessage() {

        return new ChatMessage(
                "java-room",
                "Mehedi",
                "Hello QuickTalk",
                "owner-a",
                null
        );
    }


    // =====================================================
    // OWNERSHIP
    // =====================================================

    @Test
    void correctOwnerShouldMatch() {

        ChatMessage message =
                createMessage();


        assertTrue(
                message.isOwnedBy(
                        "owner-a"
                )
        );


        assertFalse(
                message.isOwnedBy(
                        "owner-b"
                )
        );
    }


    // =====================================================
    // REACTION ADD
    // =====================================================

    @Test
    void firstReactionShouldBeAdded() {

        ChatMessage message =
                createMessage();


        boolean active =
                message.toggleReaction(
                        "👍",
                        "owner-a"
                );


        assertTrue(
                active
        );


        assertEquals(
                1,
                message
                        .getReactions()
                        .get(
                                "👍"
                        )
        );
    }


    // =====================================================
    // REACTION TOGGLE
    // =====================================================

    @Test
    void sameOwnerShouldToggleReactionOff() {

        ChatMessage message =
                createMessage();


        message.toggleReaction(
                "👍",
                "owner-a"
        );


        boolean active =
                message.toggleReaction(
                        "👍",
                        "owner-a"
                );


        assertFalse(
                active
        );


        assertFalse(
                message
                        .getReactions()
                        .containsKey(
                                "👍"
                        )
        );
    }


    // =====================================================
    // DIFFERENT OWNERS
    // =====================================================

    @Test
    void differentOwnersShouldIncreaseCount() {

        ChatMessage message =
                createMessage();


        message.toggleReaction(
                "👍",
                "owner-a"
        );


        message.toggleReaction(
                "👍",
                "owner-b"
        );


        assertEquals(
                2,
                message
                        .getReactions()
                        .get(
                                "👍"
                        )
        );
    }


    // =====================================================
    // HAS REACTION
    // =====================================================

    @Test
    void hasReactionShouldIdentifyOwner() {

        ChatMessage message =
                createMessage();


        message.toggleReaction(
                "❤️",
                "owner-a"
        );


        assertTrue(
                message.hasReaction(
                        "❤️",
                        "owner-a"
                )
        );


        assertFalse(
                message.hasReaction(
                        "❤️",
                        "owner-b"
                )
        );
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Test
    void deletingMessageShouldRemoveSensitiveData() {

        ChatMessage message =
                createMessage();


        message.toggleReaction(
                "😂",
                "owner-a"
        );


        message.markDeleted();


        assertTrue(
                message.isDeleted()
        );


        assertNull(
                message.getMessage()
        );


        assertNull(
                message.getReplyToId()
        );


        assertFalse(
                message.isOwnershipProtected()
        );


        Map<String, Integer> reactions =
                message.getReactions();


        assertTrue(
                reactions.isEmpty()
        );
    }
}