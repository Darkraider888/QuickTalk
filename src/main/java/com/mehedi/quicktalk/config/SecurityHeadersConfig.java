package com.mehedi.quicktalk.config;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;


@Configuration
public class SecurityHeadersConfig {


    @Bean
    public OncePerRequestFilter securityHeadersFilter() {


        return new OncePerRequestFilter() {


            @Override
            protected void doFilterInternal(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain)
                    throws ServletException,
                    IOException {


                // =================================================
                // MIME SNIFFING
                // =================================================

                response.setHeader(
                        "X-Content-Type-Options",
                        "nosniff"
                );


                // =================================================
                // CLICKJACKING
                // =================================================

                response.setHeader(
                        "X-Frame-Options",
                        "DENY"
                );


                // =================================================
                // REFERRER
                // =================================================

                response.setHeader(
                        "Referrer-Policy",
                        "no-referrer"
                );


                // =================================================
                // BROWSER PERMISSIONS
                //
                // QuickTalk currently does not need these.
                // =================================================

                response.setHeader(
                        "Permissions-Policy",
                        "camera=(), microphone=(), geolocation=()"
                );


                // =================================================
                // CONTENT SECURITY POLICY
                //
                // 'unsafe-inline' is currently necessary because
                // room.html uses onclick attributes.
                //
                // We can remove it later when actions are moved
                // completely into JavaScript event listeners.
                // =================================================

                response.setHeader(
                        "Content-Security-Policy",

                        "default-src 'self'; "
                                +
                                "script-src 'self' 'unsafe-inline'; "
                                +
                                "style-src 'self'; "
                                +
                                "img-src 'self' data:; "
                                +
                                "connect-src 'self' ws: wss:; "
                                +
                                "object-src 'none'; "
                                +
                                "base-uri 'self'; "
                                +
                                "frame-ancestors 'none'"
                );


                filterChain.doFilter(
                        request,
                        response
                );
            }
        };
    }
}