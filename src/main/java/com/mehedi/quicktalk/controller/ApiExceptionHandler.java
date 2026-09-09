package com.mehedi.quicktalk.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;


@RestControllerAdvice
public class ApiExceptionHandler {


    // =====================================================
    // BAD CLIENT INPUT
    // =====================================================

    @ExceptionHandler(
            IllegalArgumentException.class
    )
    public ResponseEntity<
            Map<String, String>
            > handleIllegalArgumentException(
            IllegalArgumentException exception) {


        return ResponseEntity
                .status(
                        HttpStatus.BAD_REQUEST
                )
                .body(
                        Map.of(
                                "error",
                                exception.getMessage()
                                        != null
                                        ? exception.getMessage()
                                        : "Invalid request."
                        )
                );
    }
}