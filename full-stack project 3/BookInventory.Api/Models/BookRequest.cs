using System.ComponentModel.DataAnnotations;

namespace BookInventory.Api.Models;

// A separate request model keeps clients from choosing the database-generated ID.
public class BookRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(120)]
    public string Author { get; set; } = string.Empty;

    [Required, Range(1, 9999)]
    public int? PublicationYear { get; set; }

    [Required, Range(0, 1_000_000)]
    public int? Quantity { get; set; }
}
