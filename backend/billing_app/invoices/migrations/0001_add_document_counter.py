# Generated manually for document counter
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invoice_counter', models.IntegerField(default=1)),
                ('receipt_counter', models.IntegerField(default=1)),
                ('waybill_counter', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Document Counter',
                'verbose_name_plural': 'Document Counters',
            },
        ),
    ]
