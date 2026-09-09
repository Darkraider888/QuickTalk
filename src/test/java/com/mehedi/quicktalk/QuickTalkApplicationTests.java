package com.mehedi.quicktalk;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
        properties = {
                "spring.mongodb.uri=mongodb://localhost:27017/quicktalk_test",
                "spring.mongodb.database=quicktalk_test",
                "spring.data.mongodb.auto-index-creation=false",
                "quicktalk.mongodb.ttl-index.enabled=false"
        }
)
class QuickTalkApplicationTests {

    @Test
    void contextLoads() {
    }
}
