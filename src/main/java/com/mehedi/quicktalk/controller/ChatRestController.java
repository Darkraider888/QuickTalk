package com.mehedi.quicktalk.controller;

import com.mehedi.quicktalk.model.ChatMessage;
import com.mehedi.quicktalk.service.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class ChatRestController {

    private final ChatService chatService;


    public ChatRestController(
            ChatService chatService) {

        this.chatService =
                chatService;
    }


    // ==========================================
    // GET ROOM MESSAGE HISTORY
    // ==========================================

    @GetMapping("/{room}")
    public List<ChatMessage> getRoomMessages(
            @PathVariable String room) {

        return chatService
                .getRoomMessages(room);
    }
}