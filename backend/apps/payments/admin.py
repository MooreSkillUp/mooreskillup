from django.contrib import admin

from .models import Payment, Transaction

admin.site.register(Payment)
admin.site.register(Transaction)
