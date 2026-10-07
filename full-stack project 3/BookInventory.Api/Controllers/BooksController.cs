using BookInventory.Api.Data;
using BookInventory.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookInventory.Api.Controllers;

[ApiController]
[Route("api/books")]
public class BooksController(BookInventoryContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Book>>> GetAll(CancellationToken cancellationToken)
    {
        return await db.Books.AsNoTracking().OrderBy(b => b.Id).ToListAsync(cancellationToken);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<Book>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Book>> GetById(int id, CancellationToken cancellationToken)
    {
        var book = await db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        return book is null ? NotFound() : Ok(book);
    }

    [HttpPost]
    [ProducesResponseType<Book>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Book>> Create(BookRequest request, CancellationToken cancellationToken)
    {
        var book = new Book();
        ApplyRequest(book, request);
        db.Books.Add(book);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, BookRequest request, CancellationToken cancellationToken)
    {
        var book = await db.Books.FindAsync([id], cancellationToken);
        if (book is null) return NotFound();

        ApplyRequest(book, request);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var book = await db.Books.FindAsync([id], cancellationToken);
        if (book is null) return NotFound();

        db.Books.Remove(book);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void ApplyRequest(Book book, BookRequest request)
    {
        book.Title = request.Title.Trim();
        book.Author = request.Author.Trim();
        book.PublicationYear = request.PublicationYear!.Value;
        book.Quantity = request.Quantity!.Value;
    }
}
