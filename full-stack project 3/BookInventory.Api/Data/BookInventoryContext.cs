using BookInventory.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BookInventory.Api.Data;

public class BookInventoryContext(DbContextOptions<BookInventoryContext> options)
    : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var book = modelBuilder.Entity<Book>();
        book.Property(b => b.Title).HasMaxLength(200).IsRequired();
        book.Property(b => b.Author).HasMaxLength(120).IsRequired();
        // These constraints also protect data written directly to SQL Server.
        book.ToTable("Books", table =>
        {
            table.HasCheckConstraint("CK_Books_PublicationYear", "[PublicationYear] BETWEEN 1 AND 9999");
            table.HasCheckConstraint("CK_Books_Quantity", "[Quantity] BETWEEN 0 AND 1000000");
            table.HasCheckConstraint("CK_Books_Title", "LEN(LTRIM(RTRIM([Title]))) > 0");
            table.HasCheckConstraint("CK_Books_Author", "LEN(LTRIM(RTRIM([Author]))) > 0");
        });
    }
}
