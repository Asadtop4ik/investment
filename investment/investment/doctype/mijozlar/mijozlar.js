frappe.ui.form.on('Mijozlar', {
    refresh(frm) {
        // Passport ID o'zgarganda avtomatik tekshirish
        if (!frm.is_new() && frm.doc.passport_id) {
            frm.trigger('load_sales_history');
        }

        // Camera button qo'shish
        if (frm.is_new() || !frm.doc.rasm) {
            frm.add_custom_button(__('Rasm olish'), () => {
                open_camera_dialog(frm);
            }, __('Amallar'));
        }
    },

    passport_id(frm) {
        if (frm.doc.passport_id && frm.doc.passport_id.length >= 9) {
            frm.trigger('check_existing_customer');
        }
    },

    check_existing_customer(frm) {
        if (!frm.doc.passport_id) {
            frappe.msgprint(__('Iltimos, Passport ID ni kiriting'));
            return;
        }

        frappe.call({
            method: 'investment.api.check_customer_by_passport',
            args: {
                passport_id: frm.doc.passport_id
            },
            callback(r) {
                if (r.message && r.message.exists) {
                    if (frm.is_new()) {
                        frappe.msgprint({
                            title: __('Ogohlantirish'),
                            message: __('Bu passport ID allaqachon ro\'yxatdan o\'tgan!'),
                            indicator: 'orange'
                        });

                        // Mavjud mijozni ochish taklifi
                        frappe.confirm(
                            __('Bu mijozni ochmoqchimisiz?'),
                            () => {
                                frappe.set_route('Form', 'Mijozlar', r.message.customer.name);
                            }
                        );
                    }
                }
            }
        });
    },

    load_sales_history(frm) {
        // Sotuvlar tarixini yangilash
        if (frm.doc.name) {
            frappe.call({
                method: 'investment.api.get_customer_history',
                args: {
                    customer_id: frm.doc.name
                },
                callback(r) {
                    if (r.message && r.message.length > 0) {
                        frm.clear_table('sales_history');

                        r.message.forEach(item => {
                            let row = frm.add_child('sales_history');
                            row.maxsulotlar = item.products;
                            row.narx = item.amount;
                            row.sana = item.date;
                            row.status = item.status;
                        });

                        frm.refresh_field('sales_history');
                    }
                }
            });
        }
    }
});

function open_camera_dialog(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __('Rasm olish'),
        fields: [
            {
                fieldname: 'camera_view',
                fieldtype: 'HTML'
            }
        ],
        primary_action_label: __('Suratga olish'),
        primary_action() {
            take_photo(frm, dialog);
        }
    });

    dialog.show();

    // Camera setup
    const html = `
        <div style="text-align: center;">
            <video id="camera-video" width="100%" height="400" autoplay style="border: 2px solid #ddd; border-radius: 5px;"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
        </div>
    `;

    dialog.fields_dict.camera_view.$wrapper.html(html);

    // Start camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.getElementById('camera-video');
            video.srcObject = stream;
            dialog.stream = stream;
        })
        .catch(err => {
            frappe.msgprint(__('Kamera ishga tushmadi: ') + err.message);
            dialog.hide();
        });
}

function take_photo(frm, dialog) {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(blob => {
        // Upload file
        const file = new File([blob], 'customer_photo.jpg', { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_private', 1);
        formData.append('doctype', 'Mijozlar');
        formData.append('docname', frm.doc.name || 'new');

        fetch('/api/method/upload_file', {
            method: 'POST',
            headers: {
                'X-Frappe-CSRF-Token': frappe.csrf_token
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                frm.set_value('rasm', data.message.file_url);
                frappe.msgprint(__('Rasm muvaffaqiyatli yuklandi!'));

                // Stop camera
                if (dialog.stream) {
                    dialog.stream.getTracks().forEach(track => track.stop());
                }

                dialog.hide();
            }
        })
        .catch(err => {
            frappe.msgprint(__('Xatolik: ') + err.message);
        });
    }, 'image/jpeg');
}
