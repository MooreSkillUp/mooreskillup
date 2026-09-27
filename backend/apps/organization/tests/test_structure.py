"""The company structure: departments, their shares and caps, and who is in them.

MooreSkillUp divides an operations pool across departments by percentage and
then caps each one. These records are the inputs to that calculation, so what
matters here is that they cannot quietly hold nonsense: a sub-department with a
percentage would double-count against the pool, and a share of 140% of a
department would pay out more than the department receives.

Bank details get most of the attention. The attack on a payouts system is not
stealing money, it is changing where it goes — so a change clears verification,
writes an audit row, and never records the digits it is protecting.
"""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organization.models import (
    Department,
    DepartmentMembership,
    TeamMember,
    TeamMemberBankChange,
)
from common.rbac import ADMIN, SUPER_ADMIN


def admin_user(role=SUPER_ADMIN, email=None):
    email = email or f"{role}@msu.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=role.replace("_", " ").title(),
        password="x",
        role="admin",
        admin_role=role,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def boss(db):
    return client_for(admin_user(SUPER_ADMIN))


@pytest.fixture
def dept(db):
    return Department.objects.create(
        name="Technology & Product", percent_of_pool=Decimal("22.00"), order=1
    )


@pytest.fixture
def member(db):
    return TeamMember.objects.create(full_name="Ada Obi", role_title="Developer")


class TestDepartments:
    def test_a_department_holds_its_share_and_its_cap(self, boss):
        res = boss.post(
            "/api/admin/departments/",
            {"name": "Creative & Design", "percentOfPool": "10.00", "monthlyCap": "150000.00"},
            format="json",
        )
        assert res.status_code == 201
        created = Department.objects.get(name="Creative & Design")
        assert created.percent_of_pool == Decimal("10.00")
        assert created.monthly_cap == Decimal("150000.00")
        assert created.slug == "creative-design"

    def test_a_sub_department_cannot_hold_a_share_of_the_pool(self, boss, dept):
        """The Promotion Squad sits under Marketing and is paid, if at all, out
        of its parent's allocation. A percentage of its own would be counted
        twice against the same pool."""
        res = boss.post(
            "/api/admin/departments/",
            {"name": "Promotion Squad", "parentId": str(dept.id), "percentOfPool": "5.00"},
            format="json",
        )
        assert res.status_code == 201
        squad = Department.objects.get(name="Promotion Squad")
        assert squad.parent_id == dept.id
        assert squad.percent_of_pool == Decimal("0.00")

    def test_nesting_stops_at_one_level(self, boss, dept):
        squad = Department.objects.create(name="Promotion Squad", parent=dept)

        res = boss.post(
            "/api/admin/departments/",
            {"name": "Campus Reps", "parentId": str(squad.id)},
            format="json",
        )

        assert res.status_code == 400
        assert "sub-department" in str(res.data).lower()

    def test_a_department_cannot_be_its_own_parent(self, boss, dept):
        res = boss.patch(
            f"/api/admin/departments/{dept.id}/", {"parentId": str(dept.id)}, format="json"
        )
        assert res.status_code == 400

    def test_the_listing_says_whether_the_shares_add_up(self, boss, dept):
        Department.objects.create(name="Infrastructure", percent_of_pool=Decimal("18.00"))

        res = boss.get("/api/admin/departments/")

        assert res.status_code == 200
        assert res.data["poolPercentTotal"] == "40.00"
        assert res.data["poolPercentBalanced"] is False

        Department.objects.create(name="Everything Else", percent_of_pool=Decimal("60.00"))
        res = boss.get("/api/admin/departments/")
        assert res.data["poolPercentTotal"] == "100.00"
        assert res.data["poolPercentBalanced"] is True

    def test_a_sub_department_does_not_count_towards_the_pool(self, boss, dept):
        Department.objects.create(name="Promotion Squad", parent=dept)
        assert Department.pool_percent_total() == Decimal("22.00")

    def test_an_inactive_department_does_not_count_towards_the_pool(self, dept):
        Department.objects.create(
            name="Retired", percent_of_pool=Decimal("30.00"), is_active=False
        )
        assert Department.pool_percent_total() == Decimal("22.00")


class TestMemberships:
    def test_one_lead_can_hold_two_departments(self, boss, member, dept):
        """Five leads across eight departments is the whole point of separating
        departments from people."""
        second = Department.objects.create(name="Infrastructure", percent_of_pool=Decimal("18"))

        for target in (dept, second):
            res = boss.post(
                "/api/admin/department-memberships/",
                {
                    "teamMemberId": str(member.id),
                    "departmentId": str(target.id),
                    "isLead": True,
                    "shareBasis": "percent_of_department",
                    "shareValue": "40.00",
                },
                format="json",
            )
            assert res.status_code == 201

        assert member.memberships.filter(is_lead=True).count() == 2
        assert member.is_lead is True

    def test_a_person_joins_a_department_only_once(self, boss, member, dept):
        DepartmentMembership.objects.create(team_member=member, department=dept)

        res = boss.post(
            "/api/admin/department-memberships/",
            {"teamMemberId": str(member.id), "departmentId": str(dept.id)},
            format="json",
        )

        assert res.status_code == 400

    def test_a_share_of_a_department_cannot_exceed_it(self, boss, member, dept):
        res = boss.post(
            "/api/admin/department-memberships/",
            {
                "teamMemberId": str(member.id),
                "departmentId": str(dept.id),
                "shareBasis": "percent_of_department",
                "shareValue": "140.00",
            },
            format="json",
        )
        assert res.status_code == 400
        assert "between 0 and 100" in str(res.data)

    def test_a_volunteer_carries_no_standing_share(self, boss, member, dept):
        """Promotion Squad members are volunteers. They may be given something
        out of the department's allocation, but a number sitting on the record
        is a number someone will later believe they are owed."""
        res = boss.post(
            "/api/admin/department-memberships/",
            {
                "teamMemberId": str(member.id),
                "departmentId": str(dept.id),
                "shareBasis": "none",
                "shareValue": "25.00",
            },
            format="json",
        )

        assert res.status_code == 201
        assert DepartmentMembership.objects.get(team_member=member).share_value == Decimal("0.00")

    def test_an_individual_cap_is_kept(self, boss, member, dept):
        res = boss.post(
            "/api/admin/department-memberships/",
            {
                "teamMemberId": str(member.id),
                "departmentId": str(dept.id),
                "isLead": True,
                "shareBasis": "percent_of_department",
                "shareValue": "50.00",
                "monthlyCap": "60000.00",
            },
            format="json",
        )
        assert res.status_code == 201
        assert DepartmentMembership.objects.get().monthly_cap == Decimal("60000.00")


class TestTeamMembers:
    def test_a_member_needs_no_platform_account(self, boss):
        """The designer and the video lead have no reason to sign in. Access
        follows the job, not the org chart."""
        res = boss.post(
            "/api/admin/team-members/",
            {"fullName": "Chidi Video", "roleTitle": "Video Lead", "phone": "08030000000"},
            format="json",
        )
        assert res.status_code == 201
        assert TeamMember.objects.get(full_name="Chidi Video").user_id is None

    def test_a_member_lists_the_departments_they_are_in(self, boss, member, dept):
        DepartmentMembership.objects.create(
            team_member=member,
            department=dept,
            is_lead=True,
            share_basis="percent_of_department",
            share_value=Decimal("40"),
        )

        res = boss.get(f"/api/admin/team-members/{member.id}/")

        assert res.status_code == 200
        assert res.data["departments"][0]["name"] == "Technology & Product"
        assert res.data["departments"][0]["isLead"] is True
        assert res.data["isLead"] is True

    def test_members_can_be_filtered_by_department(self, boss, member, dept):
        DepartmentMembership.objects.create(team_member=member, department=dept)
        TeamMember.objects.create(full_name="Someone Else")

        res = boss.get(f"/api/admin/team-members/?department={dept.id}")

        assert res.status_code == 200
        assert [m["fullName"] for m in res.data] == ["Ada Obi"]


class TestBankDetails:
    ENDPOINT = "/api/admin/team-members/{}/bank-details/"

    def test_the_ordinary_record_never_carries_the_account_number(self, boss, member):
        member.account_number = "0123456789"
        member.bank_name = "GTBank"
        member.save(update_fields=["account_number", "bank_name"])

        res = boss.get(f"/api/admin/team-members/{member.id}/")

        assert res.status_code == 200
        assert res.data["accountNumberMasked"] == "••••••6789"
        assert "0123456789" not in str(res.data)
        assert res.data["hasBankDetails"] is True

    def test_saving_details_records_the_change_without_the_digits(self, boss, member):
        res = boss.put(
            self.ENDPOINT.format(member.id),
            {"accountName": "Ada Obi", "bankName": "GTBank", "accountNumber": "0123456789"},
            format="json",
        )

        assert res.status_code == 200
        member.refresh_from_db()
        assert member.account_number == "0123456789"

        change = TeamMemberBankChange.objects.get(field="account_number")
        assert change.new_value == "••••••6789"
        assert "0123456789" not in change.new_value

    def test_changing_the_account_clears_verification(self, boss, member):
        """Verifying means somebody looked at these exact digits. New digits
        have not been looked at."""
        boss.put(
            self.ENDPOINT.format(member.id),
            {"accountName": "Ada Obi", "bankName": "GTBank", "accountNumber": "0123456789"},
            format="json",
        )
        boss.post(self.ENDPOINT.format(member.id), {}, format="json")
        member.refresh_from_db()
        assert member.bank_verified_at is not None

        boss.put(
            self.ENDPOINT.format(member.id), {"accountNumber": "9876543210"}, format="json"
        )

        member.refresh_from_db()
        assert member.bank_verified_at is None
        assert member.bank_verified_by is None

    def test_an_unchanged_value_is_not_recorded_and_keeps_verification(self, boss, member):
        boss.put(
            self.ENDPOINT.format(member.id),
            {"accountName": "Ada Obi", "bankName": "GTBank", "accountNumber": "0123456789"},
            format="json",
        )
        boss.post(self.ENDPOINT.format(member.id), {}, format="json")
        before = TeamMemberBankChange.objects.count()

        res = boss.put(
            self.ENDPOINT.format(member.id), {"accountNumber": "0123456789"}, format="json"
        )

        assert res.data["changed"] == []
        assert TeamMemberBankChange.objects.count() == before
        member.refresh_from_db()
        assert member.bank_verified_at is not None

    def test_a_short_account_number_is_refused(self, boss, member):
        res = boss.put(
            self.ENDPOINT.format(member.id), {"accountNumber": "12345"}, format="json"
        )
        assert res.status_code == 400
        assert "10 digits" in str(res.data)

    def test_spaces_and_dashes_are_stripped(self, boss, member):
        boss.put(
            self.ENDPOINT.format(member.id),
            {"accountNumber": "012-345 6789"},
            format="json",
        )
        member.refresh_from_db()
        assert member.account_number == "0123456789"

    def test_nothing_to_verify_is_refused(self, boss, member):
        res = boss.post(self.ENDPOINT.format(member.id), {}, format="json")
        assert res.status_code == 400

    def test_reading_the_full_number_needs_its_own_permission(self, db, member):
        """An Admin runs the day to day and can see the structure. Where
        someone's money goes is Super Admin only, because reading it is the
        step before changing it."""
        ordinary = client_for(admin_user(ADMIN, email="admin@msu.dev"))

        assert ordinary.get(f"/api/admin/team-members/{member.id}/").status_code == 200
        assert ordinary.get(self.ENDPOINT.format(member.id)).status_code == 403
        assert (
            ordinary.put(self.ENDPOINT.format(member.id), {"accountNumber": "0123456789"}).status_code
            == 403
        )


class TestWhoMayChangeWhat:
    def test_an_admin_may_look_but_not_edit(self, db, dept):
        ordinary = client_for(admin_user(ADMIN, email="admin2@msu.dev"))

        assert ordinary.get("/api/admin/departments/").status_code == 200
        assert (
            ordinary.patch(
                f"/api/admin/departments/{dept.id}/", {"percentOfPool": "99.00"}, format="json"
            ).status_code
            == 403
        )
        assert (
            ordinary.post("/api/admin/team-members/", {"fullName": "X"}, format="json").status_code
            == 403
        )

    def test_a_teacher_cannot_see_the_structure_at_all(self, db):
        teacher = User.objects.create_user(
            email="t@msu.dev",
            username="teach",
            display_name="A Teacher",
            password="x",
            role="teacher",
        )
        assert client_for(teacher).get("/api/admin/departments/").status_code == 403


class TestExport:
    def test_the_csv_carries_the_structure_but_no_account_numbers(self, boss, member, dept):
        """This file gets shared with the team. A spreadsheet of everyone's bank
        details forwarded into a WhatsApp group is a bad afternoon."""
        member.account_number = "0123456789"
        member.save(update_fields=["account_number"])
        DepartmentMembership.objects.create(
            team_member=member,
            department=dept,
            is_lead=True,
            share_basis="percent_of_department",
            share_value=Decimal("40"),
            monthly_cap=Decimal("60000"),
        )

        res = boss.get("/api/admin/organization/export/")

        assert res.status_code == 200
        body = res.content.decode()
        assert "Technology & Product" in body
        assert "Ada Obi" in body
        assert "22.00" in body
        assert "60000" in body
        assert "0123456789" not in body
        assert "6789" not in body

    def test_a_department_with_nobody_in_it_still_appears(self, boss, dept):
        res = boss.get("/api/admin/organization/export/")
        assert "Technology & Product" in res.content.decode()

    def test_export_is_super_admin_only(self, db):
        ordinary = client_for(admin_user(ADMIN, email="admin3@msu.dev"))
        assert ordinary.get("/api/admin/organization/export/").status_code == 403
