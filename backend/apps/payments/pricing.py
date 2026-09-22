"""What a particular person pays for a particular course, right now.

Every surface that shows or charges a price asks this module: the course page,
the course cards, checkout, and free enrolment. When four places each worked out
a discount for themselves they would eventually disagree, and a student would be
shown one price and charged another.

Two kinds of discount exist, and they never stack:

* a course's own fixed discount price, set on the course;
* a running campaign's percentage off the list price.

Whichever makes the course cheaper wins. A campaign is applied to the list
price, never to an already-discounted one.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone


def campaigns_running(now=None):
    from .models import DiscountCampaign

    now = now or timezone.now()
    return DiscountCampaign.objects.filter(
        is_active=True, starts_at__lte=now, ends_at__gt=now
    ).select_related("category")


def campaign_applies(campaign, course, student):
    if campaign.category_id and campaign.category_id != course.category_id:
        return False
    if campaign.audience == "founding":
        return bool(student) and student.founding_member_number is not None
    return True


def _whole_naira(amount):
    return Decimal(amount).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def price_for(course, student=None, now=None):
    """(amount, campaign or None, list_price).

    `student` is None for somebody signed out; campaigns aimed at founding
    members then do not apply, which is the honest thing to show a stranger.
    """
    list_price = Decimal(course.price or 0)
    best = list_price
    chosen = None

    if course.discount_price is not None and 0 < course.discount_price < list_price:
        best = Decimal(course.discount_price)

    if list_price > 0:
        for campaign in campaigns_running(now):
            if not campaign_applies(campaign, course, student):
                continue
            candidate = _whole_naira(list_price * (100 - campaign.percent_off) / 100)
            if candidate < best:
                best, chosen = candidate, campaign

    return max(best, Decimal("0")), chosen, list_price


def purchase_refusal(student):
    """Why this person cannot take a course right now, or None if they can.

    Shared by checkout and free enrolment, so a course that costs nothing — on
    its own or through a 100% campaign — is not a way round the launch state.
    """
    from apps.platform.models import PlatformSettings

    state = PlatformSettings.get_solo().launch_state
    if state == "pre_launch":
        return "Courses open on launch day. You will be able to start then."
    if state == "founding_beta" and (student is None or student.founding_member_number is None):
        return "Courses are open to founding members right now. Everyone else on launch day."
    return None
