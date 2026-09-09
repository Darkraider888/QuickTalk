package com.mehedi.quicktalk.controller;


import com.mehedi.quicktalk.util.ChatValidator;

import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;


@Controller
public class RoomController {


    @GetMapping("/room/{roomName}")
    public String openRoom(
            @PathVariable
            String roomName) {


        // =====================================================
        // INVALID ROOM
        // =====================================================

        if (
                !ChatValidator.isValidRoom(
                        roomName
                )
        ) {

            return "redirect:/";
        }


        // =====================================================
        // VALID ROOM
        // =====================================================

        return "forward:/room.html";
    }
}