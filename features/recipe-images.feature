Feature: Recipe images resolve from the private folder
  As someone running Forkast locally with my own dataset
  I want imported recipe images to load from the gitignored images folder
  So that I see photos without committing 625 MB or risking IndexedDB eviction

  Background:
    Given the app starts with no recipes

  Scenario: An imported recipe's image resolves to the private-images route
    Given I import a recipe whose image is "beef-noodles.jpg"
    When I resolve that recipe's image URL
    Then the image URL is "/recipe-images/beef-noodles.jpg"

  Scenario: A committed demo asset resolves against the app base
    When I resolve the image reference "demo/images/orzo.svg"
    Then the image URL is "/demo/images/orzo.svg"

  Scenario: An absolute image URL is left untouched
    When I resolve the image reference "https://cdn.example/x.jpg"
    Then the image URL is "https://cdn.example/x.jpg"
