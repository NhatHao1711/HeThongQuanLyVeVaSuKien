package com.ticketbox.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOrganizerRequestDTO {
    @NotBlank(message = "Tên tổ chức/CLB không được để trống")
    private String organizationName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String contactPhone;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String contactEmail;

    private String documentUrl;
    private String description;
}
