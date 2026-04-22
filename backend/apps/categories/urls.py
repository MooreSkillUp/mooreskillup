from rest_framework.routers import DefaultRouter

from .views import AdminCategoryViewSet, AdminSubcategoryViewSet, CategoryViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")
router.register("admin/subcategories", AdminSubcategoryViewSet, basename="admin-subcategory")

urlpatterns = router.urls
