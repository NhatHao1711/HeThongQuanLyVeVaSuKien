import java.util.*;

public class TestLogic {
    public static void main(String[] args) {
        int n = 10;
        int quantity = 8;
        int left = 0;
        boolean addedAny = false;
        
        for (int right = 0; right < n; right++) {
            if (right - left + 1 == quantity) {
                boolean leavesOrphanLeft = false;
                if (left > 0) {
                    if (left == 1) {
                        leavesOrphanLeft = true;
                    }
                }

                boolean leavesOrphanRight = false;
                if (right < n - 1) {
                    if (right == n - 2) {
                        leavesOrphanRight = true;
                    }
                }

                if (!leavesOrphanLeft && !leavesOrphanRight) {
                    System.out.println("Valid window: " + left + " to " + right);
                    addedAny = true;
                }
                left++;
            }
        }
        if (!addedAny) System.out.println("NO WINDOW FOUND");
    }
}
