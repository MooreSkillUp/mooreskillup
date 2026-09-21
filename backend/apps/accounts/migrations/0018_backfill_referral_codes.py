"""Give every existing student a referral code.

The field is null for anyone created before referrals existed, and a member who
opens their dashboard to find no link to share has nothing to act on. Generated
here rather than lazily, so the code is stable from the first time they see it.
"""

from django.db import migrations

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def give_everyone_a_code(apps, schema_editor):
    import secrets

    StudentProfile = apps.get_model("accounts", "StudentProfile")
    taken = set(
        StudentProfile.objects.exclude(referral_code=None).values_list("referral_code", flat=True)
    )
    for student in StudentProfile.objects.filter(referral_code=None):
        while True:
            code = "".join(secrets.choice(ALPHABET) for _ in range(6))
            if code not in taken:
                taken.add(code)
                break
        student.referral_code = code
        student.save(update_fields=["referral_code"])


def drop_them(apps, schema_editor):
    StudentProfile = apps.get_model("accounts", "StudentProfile")
    StudentProfile.objects.update(referral_code=None)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0017_pendingregistration_referred_by_code_and_more")]

    operations = [migrations.RunPython(give_everyone_a_code, drop_them)]
