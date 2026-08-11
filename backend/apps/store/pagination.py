from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """Honor ?page_size= so storefront can load the full catalog."""

    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 500
