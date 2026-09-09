package com.mehedi.quicktalk.config;

import com.mehedi.quicktalk.model.ChatMessage;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

import java.time.Duration;

@Configuration
public class MongoIndexConfig {

    @Bean
    @ConditionalOnProperty(
            name = "quicktalk.mongodb.ttl-index.enabled",
            havingValue = "true",
            matchIfMissing = true
    )
    public ApplicationRunner createMessageTtlIndex(
            MongoTemplate mongoTemplate) {

        return args -> {

            Index index = new Index()
                    .on("createdAt", Sort.Direction.ASC)
                    .named("message_ttl")
                    .expire(Duration.ofHours(24));

            String indexName =
                    mongoTemplate
                            .indexOps(ChatMessage.class)
                            .ensureIndex(index);

            System.out.println(
                    "TTL INDEX CREATED/VERIFIED: "
                            + indexName
            );
        };
    }
}