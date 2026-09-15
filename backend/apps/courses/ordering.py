"""One writer for sibling order, so a position can never collide.

Sections, lessons, tasks and projects each carry an `order` that must be unique
within their parent. The studio used to save each row's position with its own
PATCH, one request at a time — so moving a row into a slot another row still
held violated the unique constraint partway through and returned a 500. A
teacher could not reorder anything, and a course whose rows were numbered from
zero failed on every autosave.

Order is now written in exactly two places: appended on create, and
re-sequenced as a whole, inside one transaction, by the reorder endpoints.
"""

from django.db import transaction
from django.db.models import F, Max


class OrderMismatch(ValueError):
    """The ids given are not exactly the parent's children, each once."""


def next_order(queryset):
    """The slot after the last sibling, so a new row never lands on an old one."""
    highest = queryset.aggregate(highest=Max("order"))["highest"]
    return 1 if highest is None else highest + 1


def apply_order(queryset, ordered_ids):
    """Renumber siblings 1..N in the order given, atomically.

    Two passes. Every row is first lifted above the highest existing position,
    so no final position is still occupied when it is assigned; then each row
    takes its place. Done under a row lock inside one transaction, a concurrent
    save cannot interleave with it.

    `ordered_ids` must name every child exactly once. A partial list would leave
    the unnamed rows without a defined position, so it is refused rather than
    guessed at.
    """
    wanted = [str(item) for item in ordered_ids]

    with transaction.atomic():
        rows = list(queryset.select_for_update())
        existing = {str(row.pk) for row in rows}
        if len(wanted) != len(set(wanted)) or set(wanted) != existing:
            raise OrderMismatch("The list must name every item here exactly once.")
        if not rows:
            return

        # Above every current value, so the shift itself cannot collide either.
        offset = max(row.order for row in rows) + len(rows) + 1
        queryset.model.objects.filter(pk__in=existing).update(order=F("order") + offset)
        for position, pk in enumerate(wanted, start=1):
            queryset.model.objects.filter(pk=pk).update(order=position)
