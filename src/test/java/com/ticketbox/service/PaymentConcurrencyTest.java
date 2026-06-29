package com.ticketbox.service;

import com.ticketbox.entity.Order;
import com.ticketbox.entity.User;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PaymentConcurrencyTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testOptimisticLocking() throws InterruptedException {
        // 1. Tạo dữ liệu giả
        User user = userRepository.save(User.builder()
                .email("test_locking@gmail.com")
                .passwordHash("password")
                .fullName("Test User")
                .build());

        Order order = Order.builder()
                .user(user)
                .totalAmount(BigDecimal.valueOf(100000))
                .paymentStatus(PaymentStatus.PENDING)
                .transactionRef("TXN_123456")
                .build();
        
        Order savedOrder = orderRepository.save(order);
        final Long orderId = savedOrder.getId();

        // 2. Giả lập 2 Webhook đến cùng lúc bằng 2 Threads
        int numberOfThreads = 2;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Runnable webhookTask = () -> {
            try {
                // Đọc order từ DB
                Order dbOrder = orderRepository.findById(orderId).orElseThrow();
                
                // Giả sử lấy được thông tin từ webhook và tiến hành cập nhật trạng thái
                dbOrder.setPaymentStatus(PaymentStatus.PAID);
                orderRepository.save(dbOrder); // Lưu xuống DB
                
                successCount.incrementAndGet();
            } catch (ObjectOptimisticLockingFailureException e) {
                // Thread thứ 2 sẽ bị dính lỗi này vì version đã thay đổi
                System.out.println("❌ Đã chặn thành công 1 request trùng lặp nhờ Optimistic Locking!");
                failureCount.incrementAndGet();
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                latch.countDown();
            }
        };

        executorService.submit(webhookTask);
        executorService.submit(webhookTask);

        latch.await();

        // 3. Kiểm tra kết quả
        // Chỉ duy nhất 1 thread thành công, thread còn lại bị văng lỗi OptimisticLocking
        assertEquals(1, successCount.get());
        assertEquals(1, failureCount.get());
    }
}
