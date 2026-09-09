package com.mehedi.quicktalk.repository;

import com.mehedi.quicktalk.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository
        extends MongoRepository<ChatMessage, String> {

    // Get only the newest 100 messages
    List<ChatMessage>
    findTop100ByRoomOrderByCreatedAtDesc(
            String room
    );
}