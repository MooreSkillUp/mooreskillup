from django.urls import path

from .views import (
    AdminPaymentRefundView,
    AdminTransactionExportView,
    AdminTransactionListView,
    PaymentInitializeView,
    PaymentListView,
    PaymentVerifyView,
    PaymentWebhookView,
)

urlpatterns = [
    path("payments/", PaymentListView.as_view(), name="payments"),
    path("payments/initialize/", PaymentInitializeView.as_view(), name="payments-initialize"),
    path("payments/verify/", PaymentVerifyView.as_view(), name="payments-verify"),
    path("payments/webhooks/<str:provider>/", PaymentWebhookView.as_view(), name="payments-webhook"),
    path("admin/transactions/", AdminTransactionListView.as_view(), name="admin-transactions"),
    path("admin/transactions/export/", AdminTransactionExportView.as_view(), name="admin-transactions-export"),
    path("admin/payments/<uuid:payment_id>/refund/", AdminPaymentRefundView.as_view(), name="admin-payment-refund"),
]
