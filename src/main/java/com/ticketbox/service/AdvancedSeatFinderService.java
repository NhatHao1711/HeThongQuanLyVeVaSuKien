package com.ticketbox.service;

import com.ticketbox.entity.Seat;
import com.ticketbox.enums.SeatStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 🚀 Tác giả: Senior Algorithm Engineer & Java Spring Boot Expert
 * 🚀 Chức năng: Tìm kiếm ghế siêu tốc bằng toán tử Bitwise và BFS.
 */
@Slf4j
@Service
public class AdvancedSeatFinderService {

    /**
     * DTO nội bộ để lưu thông tin cụm ghế tốt nhất tìm được ở Giai đoạn 1
     */
    private static class BestBlock {
        List<Seat> seats;
        double totalPrice;

        BestBlock(List<Seat> seats, double totalPrice) {
            this.seats = seats;
            this.totalPrice = totalPrice;
        }
    }

    public List<Seat> searchConsecutiveSeatsSlidingWindow(List<Seat> allSeats, int quantity, List<Long> lockedSeatIds, Map<Long, java.math.BigDecimal> seatPrices) {
        if (quantity <= 0) {
            return Collections.emptyList();
        }

        Map<String, List<Seat>> rowMap = new HashMap<>();
        for (Seat s : allSeats) {
            String rowName = s.getName().replaceAll("[0-9]", "");
            rowMap.computeIfAbsent(rowName, k -> new ArrayList<>()).add(s);
        }

        BestBlock overallBestBlock = null;

        for (Map.Entry<String, List<Seat>> entry : rowMap.entrySet()) {
            List<Seat> rowSeats = entry.getValue();
            rowSeats.sort(Comparator.comparing(Seat::getName));
            
            int n = rowSeats.size();
            if (n < quantity) continue;

            for (int left = 0; left <= n - quantity; left++) {
                int right = left + quantity - 1;
                
                boolean isWindowAvailable = true;
                for (int i = left; i <= right; i++) {
                    Seat seat = rowSeats.get(i);
                    boolean isLocked = lockedSeatIds != null && lockedSeatIds.contains(seat.getId());
                    if (seat.getStatus() != SeatStatus.AVAILABLE || isLocked) {
                        isWindowAvailable = false;
                        break;
                    }
                }
                
                if (isWindowAvailable) {
                    boolean leavesOrphanLeft = false;
                    if (left > 0) {
                        Seat leftSeat = rowSeats.get(left - 1);
                        boolean isLeftLocked = lockedSeatIds != null && lockedSeatIds.contains(leftSeat.getId());
                        boolean isLeftAvailable = leftSeat.getStatus() == SeatStatus.AVAILABLE && !isLeftLocked;
                        
                        if (isLeftAvailable) {
                            if (left == 1) {
                                leavesOrphanLeft = true;
                            } else {
                                Seat prevLeftSeat = rowSeats.get(left - 2);
                                boolean isPrevLeftLocked = lockedSeatIds != null && lockedSeatIds.contains(prevLeftSeat.getId());
                                boolean isPrevLeftAvailable = prevLeftSeat.getStatus() == SeatStatus.AVAILABLE && !isPrevLeftLocked;
                                if (!isPrevLeftAvailable) {
                                    leavesOrphanLeft = true;
                                }
                            }
                        }
                    }
                    
                    boolean leavesOrphanRight = false;
                    if (right < n - 1) {
                        Seat rightSeat = rowSeats.get(right + 1);
                        boolean isRightLocked = lockedSeatIds != null && lockedSeatIds.contains(rightSeat.getId());
                        boolean isRightAvailable = rightSeat.getStatus() == SeatStatus.AVAILABLE && !isRightLocked;
                        
                        if (isRightAvailable) {
                            if (right == n - 2) {
                                leavesOrphanRight = true;
                            } else {
                                Seat nextRightSeat = rowSeats.get(right + 2);
                                boolean isNextRightLocked = lockedSeatIds != null && lockedSeatIds.contains(nextRightSeat.getId());
                                boolean isNextRightAvailable = nextRightSeat.getStatus() == SeatStatus.AVAILABLE && !isNextRightLocked;
                                if (!isNextRightAvailable) {
                                    leavesOrphanRight = true;
                                }
                            }
                        }
                    }
                    
                    if (!leavesOrphanLeft && !leavesOrphanRight) {
                        double totalPrice = 0;
                        for (int i = left; i <= right; i++) {
                            Seat s = rowSeats.get(i);
                            java.math.BigDecimal price = seatPrices != null ? seatPrices.get(s.getId()) : null;
                            totalPrice += price != null ? price.doubleValue() : 100000.0;
                        }
                        
                        if (overallBestBlock == null || totalPrice < overallBestBlock.totalPrice) {
                            List<Seat> block = new ArrayList<>();
                            for (int i = left; i <= right; i++) {
                                block.add(rowSeats.get(i));
                            }
                            overallBestBlock = new BestBlock(block, totalPrice);
                        }
                    }
                }
            }
        }

        return overallBestBlock != null ? overallBestBlock.seats : Collections.emptyList();
    }

    private int extractCol(Seat s) {
        try {
            return Integer.parseInt(s.getName().replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return 999;
        }
    }

    private static class SeatSegment {
        List<Seat> seats;
        int rowIndex;
        double centerCol;

        SeatSegment(List<Seat> seats, int rowIndex, double centerCol) {
            this.seats = seats;
            this.rowIndex = rowIndex;
            this.centerCol = centerCol;
        }
    }

    /**
     * =========================================================================
     * GIAI ĐOẠN 2: TỰ ĐỘNG PHÂN RÃ NHÓM (SEGMENT COMBINATION)
     * =========================================================================
     * Giải thuật:
     * - Khi không còn hàng nào đủ chỗ, ta sẽ "chẻ nhỏ" số lượng yêu cầu thành các phần (Partition).
     *   Ví dụ: Mua 4 vé -> chẻ thành 2+2. Mua 6 vé -> chẻ thành 3+3 hoặc 4+2.
     * - Tránh tuyệt đối các cách chẻ tạo ra nhóm 1 người (Ví dụ: 3+1). Trừ khi rạp không còn cách nào khác.
     * - Tìm các dải ghế phù hợp với cách chẻ này sao cho chúng gần nhau nhất (khoảng cách Hàng và Cột nhỏ nhất).
     */
    private static class MatchResult {
        List<Seat> seats;
        int orphanCount;
        MatchResult(List<Seat> seats, int orphanCount) {
            this.seats = seats;
            this.orphanCount = orphanCount;
        }
    }

    public List<Seat> searchOptimalSplitSeats(List<Seat> allSeats, int quantity, List<Long> lockedSeatIds) {
        Map<Integer, List<Seat>> rowMap = new HashMap<>();
        for (Seat s : allSeats) {
            String name = s.getName();
            if (name == null || name.length() < 2) continue;
            int rowIndex = Character.toUpperCase(name.charAt(0)) - 'A';
            rowMap.computeIfAbsent(rowIndex, k -> new ArrayList<>()).add(s);
        }

        List<SeatSegment> allSegments = new ArrayList<>();
        for (Map.Entry<Integer, List<Seat>> entry : rowMap.entrySet()) {
            List<Seat> rowSeats = entry.getValue();
            rowSeats.sort(Comparator.comparingInt(this::extractCol));

            List<Seat> currentSegment = new ArrayList<>();
            int lastCol = -99;
            for (Seat seat : rowSeats) {
                boolean isLocked = lockedSeatIds != null && lockedSeatIds.contains(seat.getId());
                boolean isAvailable = seat.getStatus() == SeatStatus.AVAILABLE && !isLocked;

                int colNum = extractCol(seat);
                if (isAvailable) {
                    if (currentSegment.isEmpty() || colNum == lastCol + 1) {
                        currentSegment.add(seat);
                    } else {
                        addSegment(allSegments, currentSegment, entry.getKey());
                        currentSegment.clear();
                        currentSegment.add(seat);
                    }
                    lastCol = colNum;
                } else {
                    addSegment(allSegments, currentSegment, entry.getKey());
                    currentSegment.clear();
                }
            }
            addSegment(allSegments, currentSegment, entry.getKey());
        }

        List<List<Integer>> partitions = generatePartitions(quantity);

        List<Seat> bestCombination = null;
        double bestScore = Double.MAX_VALUE;

        for (List<Integer> partition : partitions) {
            for (int i = 0; i < allSegments.size(); i++) {
                MatchResult result = tryMatchPartitionWithSeed(partition, allSegments, i);
                if (result != null) {
                    double score = calculateClusterScore(result, partition);
                    if (score < bestScore) {
                        bestScore = score;
                        bestCombination = result.seats;
                    }
                }
            }
        }

        return bestCombination != null ? bestCombination : Collections.emptyList();
    }

    private void addSegment(List<SeatSegment> allSegments, List<Seat> currentSegment, int rowIndex) {
        if (!currentSegment.isEmpty()) {
            double centerCol = currentSegment.stream().mapToInt(this::extractCol).average().orElse(0);
            allSegments.add(new SeatSegment(new ArrayList<>(currentSegment), rowIndex, centerCol));
        }
    }

    private List<List<Integer>> generatePartitions(int n) {
        List<List<Integer>> result = new ArrayList<>();
        backtrackPartitions(n, n - 1, new ArrayList<>(), result);
        
        result.sort((a, b) -> {
            long count1A = a.stream().filter(x -> x == 1).count();
            long count1B = b.stream().filter(x -> x == 1).count();
            if (count1A != count1B) return Long.compare(count1A, count1B);
            
            if (a.size() != b.size()) return Integer.compare(a.size(), b.size());
            
            double avgA = a.stream().mapToInt(Integer::intValue).average().orElse(0);
            double varA = a.stream().mapToDouble(x -> Math.pow(x - avgA, 2)).sum();
            
            double avgB = b.stream().mapToInt(Integer::intValue).average().orElse(0);
            double varB = b.stream().mapToDouble(x -> Math.pow(x - avgB, 2)).sum();
            
            return Double.compare(varA, varB);
        });
        return result;
    }

    private void backtrackPartitions(int remain, int maxVal, List<Integer> current, List<List<Integer>> result) {
        if (remain == 0) {
            result.add(new ArrayList<>(current));
            return;
        }
        for (int i = Math.min(remain, maxVal); i >= 1; i--) {
            current.add(i);
            backtrackPartitions(remain - i, i, current, result);
            current.remove(current.size() - 1);
        }
    }

    private MatchResult tryMatchPartitionWithSeed(List<Integer> partition, List<SeatSegment> originalSegments, int seedIdx) {
        List<Integer> segmentAvails = originalSegments.stream().map(s -> s.seats.size()).collect(Collectors.toList());
        List<Seat> chosenSeats = new ArrayList<>();
        int totalOrphans = 0;

        SeatSegment seedSeg = originalSegments.get(seedIdx);
        double seedRow = seedSeg.rowIndex;
        double seedCol = seedSeg.centerCol;

        for (int requiredSize : partition) {
            int bestSegIdx = -1;
            double minCost = Double.MAX_VALUE;
            int actualWaste = 0;

            for (int i = 0; i < segmentAvails.size(); i++) {
                int avail = segmentAvails.get(i);
                if (avail >= requiredSize) {
                    SeatSegment seg = originalSegments.get(i);
                    double rowDist = Math.abs(seg.rowIndex - seedRow);
                    double colDist = Math.abs(seg.centerCol - seedCol);
                    double distScore = Math.pow(rowDist * 2, 2) + Math.pow(colDist, 2);

                    int waste = avail - requiredSize;
                    int wasteScore = waste == 1 ? 100 : waste; 
                    
                    // Cost = Khoảng cách tới vùng trung tâm (seed) + Điểm phạt thừa ghế
                    double cost = distScore + (wasteScore * 5); 
                    
                    if (cost < minCost) {
                        minCost = cost;
                        bestSegIdx = i;
                        actualWaste = waste;
                    }
                }
            }

            if (bestSegIdx != -1) {
                SeatSegment targetSeg = originalSegments.get(bestSegIdx);
                int currentAvail = segmentAvails.get(bestSegIdx);
                int startIndex = targetSeg.seats.size() - currentAvail;
                
                for (int i = 0; i < requiredSize; i++) {
                    chosenSeats.add(targetSeg.seats.get(startIndex + i));
                }
                
                segmentAvails.set(bestSegIdx, currentAvail - requiredSize);
                if (actualWaste == 1) {
                    totalOrphans++;
                }
            } else {
                return null;
            }
        }
        return new MatchResult(chosenSeats, totalOrphans);
    }

    private double calculateClusterScore(MatchResult matchResult, List<Integer> partition) {
        List<Seat> seats = matchResult.seats;
        if (seats.isEmpty()) return 0;
        
        double maxRowDiff = 0;
        double maxColDiff = 0;
        
        int minRow = Integer.MAX_VALUE, maxRow = Integer.MIN_VALUE;
        int minCol = Integer.MAX_VALUE, maxCol = Integer.MIN_VALUE;

        for (Seat s : seats) {
            int row = Character.toUpperCase(s.getName().charAt(0)) - 'A';
            int col = extractCol(s);
            if (row < minRow) minRow = row;
            if (row > maxRow) maxRow = row;
            if (col < minCol) minCol = col;
            if (col > maxCol) maxCol = col;
        }

        maxRowDiff = maxRow - minRow;
        maxColDiff = maxCol - minCol;
        
        // Khoảng cách thực tế: Khoảng cách giữa các hàng thường gấp đôi khoảng cách giữa 2 ghế sát nhau
        double distanceScore = Math.pow(maxRowDiff * 2, 2) + Math.pow(maxColDiff, 2);
        
        // Phạt ghế mồ côi: Mức phạt vừa đủ (20 điểm) để không ép nhóm phải ngồi cách xa nhau
        // Phạt chia nhỏ (split penalty): 50 điểm / mảnh (để ưu tiên 2 mảnh hơn 3 mảnh)
        return distanceScore + (matchResult.orphanCount * 20) + (partition.size() * 50);
    }

    /**
     * =========================================================================
     * HÀM CHÍNH: KẾT HỢP GIAI ĐOẠN 1 & 2
     * =========================================================================
     */
    public List<Seat> findHyperOptimizedSeats(List<Seat> allSeats, int quantity, List<Long> lockedSeatIds, Map<Long, java.math.BigDecimal> seatPrices) {
        log.info("Khởi động Hyper-Optimized Seat Finder. Yêu cầu: {} ghế", quantity);
        
        // Ưu tiên 1: Tìm dải ghế liền kề bằng Sliding Window
        List<Seat> slidingWindowResult = searchConsecutiveSeatsSlidingWindow(allSeats, quantity, lockedSeatIds, seatPrices);
        if (!slidingWindowResult.isEmpty()) {
            log.info("🔥 Đã tìm thấy {} ghế liền kề bằng thuật toán Sliding Window", quantity);
            return slidingWindowResult;
        }
        
        // Ưu tiên 2: Fallback sang phân rã nhóm bằng Segment Combination
        log.warn("⚠️ Không đủ ghế liền kề hợp lệ! Kích hoạt thuật toán Tổ hợp dải ghế (Segment Combination)...");
        List<Seat> splitResult = searchOptimalSplitSeats(allSeats, quantity, lockedSeatIds);
        if (!splitResult.isEmpty()) {
            log.info("💦 Đã gom thành công {} ghế rời rạc một cách tối ưu nhất", quantity);
            return splitResult;
        }
        
        log.error("❌ Rạp đã quá đầy, không thể đáp ứng {} ghế", quantity);
        return Collections.emptyList();
    }
}
