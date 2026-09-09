package com.mehedi.quicktalk.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;


@Document(collection = "messages")
public class ChatMessage {


    // =====================================================
    // DATABASE ID
    // =====================================================

    @Id
    private String id;


    // =====================================================
    // BASIC MESSAGE DATA
    // =====================================================

    private String room;

    private String sender;

    private String message;


    // =====================================================
    // TEMPORARY OWNERSHIP
    // =====================================================

    /*
     * SHA-256 hash of the sender's private
     * browser ownership token.
     *
     * IMPORTANT:
     *
     * We intentionally do NOT provide:
     *
     * getOwnerId()
     *
     * Therefore the ownership hash is not
     * exposed through normal message JSON.
     */
    private String ownerId;


    // =====================================================
    // REPLY
    // =====================================================

    /*
     * Only the original message ID is stored.
     *
     * We do NOT copy the original message text.
     */
    private String replyToId;


    // =====================================================
    // DELETE
    // =====================================================

    private boolean deleted;


    // =====================================================
    // REACTIONS
    // =====================================================

    /*
     * Example internally:
     *
     * 👍 -> [
     *      ownerHashA,
     *      ownerHashB
     * ]
     *
     * ❤️ -> [
     *      ownerHashC
     * ]
     *
     * These owner hashes are NEVER exposed
     * to the frontend.
     *
     * The frontend only receives:
     *
     * 👍 -> 2
     * ❤️ -> 1
     */
    private Map<String, Set<String>> reactionOwners =
            new HashMap<>();


    // =====================================================
    // TTL
    // =====================================================

    @Indexed(
            name = "message_ttl",
            expireAfter = "24h"
    )
    private Instant createdAt;


    // =====================================================
    // EMPTY CONSTRUCTOR
    // =====================================================

    public ChatMessage() {
    }


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public ChatMessage(
            String room,
            String sender,
            String message,
            String ownerId,
            String replyToId) {


        this.room =
                room;


        this.sender =
                sender;


        this.message =
                message;


        this.ownerId =
                ownerId;


        this.replyToId =
                replyToId;


        this.deleted =
                false;


        this.reactionOwners =
                new HashMap<>();


        this.createdAt =
                Instant.now();
    }


    // =====================================================
    // ID
    // =====================================================

    public String getId() {

        return id;
    }


    public void setId(
            String id) {

        this.id =
                id;
    }


    // =====================================================
    // ROOM
    // =====================================================

    public String getRoom() {

        return room;
    }


    public void setRoom(
            String room) {

        this.room =
                room;
    }


    // =====================================================
    // SENDER
    // =====================================================

    public String getSender() {

        return sender;
    }


    public void setSender(
            String sender) {

        this.sender =
                sender;
    }


    // =====================================================
    // MESSAGE
    // =====================================================

    public String getMessage() {

        return message;
    }


    public void setMessage(
            String message) {

        this.message =
                message;
    }


    // =====================================================
    // REPLY
    // =====================================================

    public String getReplyToId() {

        return replyToId;
    }


    public void setReplyToId(
            String replyToId) {

        this.replyToId =
                replyToId;
    }


    // =====================================================
    // DELETED
    // =====================================================

    public boolean isDeleted() {

        return deleted;
    }


    public void setDeleted(
            boolean deleted) {

        this.deleted =
                deleted;
    }


    // =====================================================
    // CREATED AT
    // =====================================================

    public Instant getCreatedAt() {

        return createdAt;
    }


    public void setCreatedAt(
            Instant createdAt) {

        this.createdAt =
                createdAt;
    }


    // =====================================================
    // OWNERSHIP PROTECTED?
    // =====================================================

    /*
     * Safe information for frontend.
     *
     * This tells the browser that this
     * message supports secure owner deletion.
     *
     * It does NOT reveal the owner hash.
     */
    public boolean isOwnershipProtected() {

        return ownerId != null
                && !ownerId.isBlank();
    }


    // =====================================================
    // OWNERSHIP CHECK
    // =====================================================

    public boolean isOwnedBy(
            String candidateOwnerId) {


        if (
                ownerId == null
                        ||
                        candidateOwnerId == null
        ) {

            return false;
        }


        return ownerId.equals(
                candidateOwnerId
        );
    }


    // =====================================================
    // PUBLIC REACTION COUNTS
    // =====================================================

    /*
     * This is what is sent to browsers.
     *
     * Example:
     *
     * {
     *     "👍": 2,
     *     "❤️": 1
     * }
     *
     * The owner hashes remain private.
     */
    public Map<String, Integer> getReactions() {


        Map<String, Integer> counts =
                new HashMap<>();


        if (reactionOwners == null) {

            return counts;
        }


        for (
                Map.Entry<
                        String,
                        Set<String>
                        > entry
                : reactionOwners.entrySet()
        ) {

            if (
                    entry.getValue() == null
                            ||
                            entry.getValue().isEmpty()
            ) {

                continue;
            }


            counts.put(
                    entry.getKey(),
                    entry.getValue().size()
            );
        }


        return counts;
    }


    // =====================================================
    // TOGGLE REACTION
    // =====================================================

    public boolean toggleReaction(
            String emoji,
            String reactorOwnerId) {


        if (
                emoji == null
                        ||
                        emoji.isBlank()
                        ||
                        reactorOwnerId == null
                        ||
                        reactorOwnerId.isBlank()
        ) {

            return false;
        }


        if (reactionOwners == null) {

            reactionOwners =
                    new HashMap<>();
        }


        Set<String> owners =
                reactionOwners
                        .computeIfAbsent(
                                emoji,
                                key ->
                                        new HashSet<>()
                        );


        // -------------------------------------------------
        // ALREADY REACTED
        // → remove reaction
        // -------------------------------------------------

        if (
                owners.contains(
                        reactorOwnerId
                )
        ) {

            owners.remove(
                    reactorOwnerId
            );


            if (owners.isEmpty()) {

                reactionOwners.remove(
                        emoji
                );
            }


            return false;
        }


        // -------------------------------------------------
        // ADD REACTION
        // -------------------------------------------------

        owners.add(
                reactorOwnerId
        );


        return true;
    }

// =====================================================
// CHECK USER REACTION
// =====================================================

    public boolean hasReaction(
            String emoji,
            String reactorOwnerId) {


        if (
                emoji == null
                        ||
                        emoji.isBlank()
                        ||
                        reactorOwnerId == null
                        ||
                        reactorOwnerId.isBlank()
                        ||
                        reactionOwners == null
        ) {

            return false;
        }


        Set<String> owners =
                reactionOwners.get(
                        emoji
                );


        return owners != null
                &&
                owners.contains(
                        reactorOwnerId
                );
    }
    // =====================================================
    // CLEAR REACTIONS
    // =====================================================

    public void clearReactions() {

        if (reactionOwners != null) {

            reactionOwners.clear();
        }
    }


    // =====================================================
    // MARK MESSAGE DELETED
    // =====================================================

    public void markDeleted() {


        /*
         * Delete actual content immediately.
         */

        this.message =
                null;


        /*
         * Remove ownership information because
         * there is nothing left to control.
         */

        this.ownerId =
                null;


        /*
         * A deleted reply no longer needs its
         * own quoted reference.
         */

        this.replyToId =
                null;


        /*
         * Reactions disappear with deleted content.
         */

        clearReactions();


        this.deleted =
                true;
    }
}